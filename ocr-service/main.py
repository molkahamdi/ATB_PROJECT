# ============================================================
#   — PaddleOCR 3.x VERSION FINALE v5.4 + Prometheus
# ============================================================
import re, uuid, json, shutil, os, time
from pathlib import Path

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
import uvicorn
from paddleocr import PaddleOCR
from PIL import Image, ImageOps

# ── Prometheus avec registry sécurisé ─────────────────────
from prometheus_client import (
    Counter, Histogram, Gauge,
    generate_latest, CONTENT_TYPE_LATEST,
    CollectorRegistry, REGISTRY
)

def _get_or_create_counter(name, description, labels):
    """Récupère ou crée un Counter sans duplication"""
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Counter(name, description, labels)

def _get_or_create_histogram(name, description, labels, buckets):
    """Récupère ou crée un Histogram sans duplication"""
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Histogram(name, description, labels, buckets=buckets)

def _get_or_create_gauge(name, description, labels):
    """Récupère ou crée un Gauge sans duplication"""
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Gauge(name, description, labels)

# Métriques Prometheus
ocr_requests_total = _get_or_create_counter(
    'ocr_requests_total',
    'Nombre total de requêtes OCR reçues',
    ['doc_type', 'status']
)

ocr_processing_duration = _get_or_create_histogram(
    'ocr_processing_duration_seconds',
    'Durée de traitement OCR en secondes',
    ['doc_type'],
    [0.5, 1, 2, 5, 10, 30, 60]
)

ocr_confidence_score = _get_or_create_gauge(
    'ocr_confidence_score',
    'Score de confiance du dernier résultat OCR',
    ['doc_type']
)

ocr_uploads_total = _get_or_create_counter(
    'ocr_uploads_total',
    'Nombre total de fichiers uploadés',
    ['ext']
)

http_errors_total = _get_or_create_counter(
    'http_errors_total',
    'Nombre total d erreurs HTTP',
    ['status_code', 'endpoint']
)
# ─────────────────────────────────────────────────────────

app = FastAPI(title="ATB DigiPack OCR", version="5.4.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

print("Chargement PaddleOCR 3.x...")
ocr = PaddleOCR(lang="ar", device="cpu")
print("PaddleOCR pret!")

UPLOAD_DIR = Path("./uploads/raw")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MOIS_AR = {
    'جانفي': '01', 'فيفري': '02', 'مارس': '03', 'أفريل': '04',
    'ماي': '05', 'جوان': '06', 'جويلية': '07', 'أوت': '08',
    'سبتمبر': '09', 'أكتوبر': '10', 'اكتوبر': '10',
    'نوفمبر': '11', 'ديسمبر': '12', 'يناير': '01',
    'فبراير': '02', 'إبريل': '04', 'مايو': '05',
    'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
}

LAQAB_VARS = ['اللقب', 'للقب', 'القب', 'لقب', 'اللقت', 'اللقي']
ISM_VARS = ['الاسم', 'لا سم', 'لاسم', 'الإسم', 'لأسم', 'الاسن']
DATE_VARS = [
    'تاريخ الولادة', 'تاتخ الولادة', 'ثاتخ الوبلادة',
    'تاريخ', 'تاتخ', 'ثاتخ',
    'ناعخ الولادة', 'ناعخ', 'تارخ', 'تاريح',
    'الولادة', 'لولادة', 'ولادة',
]


# ══════════════════════════════════════════════════════════
#   ENDPOINTS
# ══════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "service": "ATB OCR v5.4"}


@app.get("/metrics")
def metrics():
    """Endpoint Prometheus — collecte des métriques du service OCR"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


@app.post("/ocr/scan")
async def scan_document(
    document: UploadFile = File(...),
    docType: str = Form(...),
    customerId: str = Form(default=""),
):
    if docType not in {"CIN_RECTO", "CIN_VERSO", "PASSPORT"}:
        http_errors_total.labels(status_code='400', endpoint='/ocr/scan').inc()
        raise HTTPException(400, f"docType invalide: {docType}")

    if docType == "CIN_VERSO":
        doc_id = str(uuid.uuid4())
        ext = Path(document.filename).suffix.lower()
        try:
            fp = UPLOAD_DIR / f"{doc_id}{ext}"
            with open(fp, "wb") as f:
                shutil.copyfileobj(document.file, f)
            ocr_uploads_total.labels(ext=ext).inc()
            ocr_requests_total.labels(doc_type='CIN_VERSO', status='success').inc()
            print(f"CIN_VERSO archive : {doc_id}{ext}")
        except Exception as e:
            ocr_requests_total.labels(doc_type='CIN_VERSO', status='error').inc()
            print(f"Warn verso: {e}")
        return {"success": True, "ocrDocumentId": doc_id,
                "allTokens": [], "parsedData": {}, "confidence": 1.0, "docType": "CIN_VERSO"}

    ext = Path(document.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png"}:
        http_errors_total.labels(status_code='400', endpoint='/ocr/scan').inc()
        raise HTTPException(400, "Utilisez JPG ou PNG.")

    ocr_uploads_total.labels(ext=ext).inc()

    doc_id = str(uuid.uuid4())
    fp = UPLOAD_DIR / f"{doc_id}{ext}"
    with open(fp, "wb") as f:
        shutil.copyfileobj(document.file, f)

    print(f"\n{'='*55}")
    print(f"[{docType}] {doc_id}{ext} | customer={customerId}")

    # EXIF + redimensionnement automatique
    try:
        img = Image.open(fp)
        img = ImageOps.exif_transpose(img)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        MAX_SIZE = 1400
        w, h = img.size
        if max(w, h) > MAX_SIZE:
            ratio = MAX_SIZE / max(w, h)
            new_w, new_h = int(w * ratio), int(h * ratio)
            img = img.resize((new_w, new_h), Image.LANCZOS)
            print(f"Image redimensionnee : {w}x{h} -> {new_w}x{new_h} px")
        else:
            print(f"Image : {w}x{h} px")
        img.save(fp, 'JPEG', quality=92)
    except Exception as e:
        print(f"Warn EXIF: {e}")

    # ── Traitement OCR avec mesure de durée ──────────────
    try:
        start_time = time.time()

        result_list = list(ocr.predict(str(fp)))
        items, conf = extract_items(result_list)
        items_sorted = sorted(items, key=lambda x: x["cy"])
        lines = group_by_line(items_sorted, tolerance=30)

        duration = time.time() - start_time

        ocr_processing_duration.labels(doc_type=docType).observe(duration)
        ocr_requests_total.labels(doc_type=docType, status='success').inc()
        ocr_confidence_score.labels(doc_type=docType).set(conf)

        print(f"Tokens ({len(items)}, conf {conf:.0%}, duree {duration:.2f}s) :")
        for i, line in enumerate(lines):
            print(f"  L{i:02d}: {[it['text'] for it in line]}")

    except Exception as e:
        ocr_requests_total.labels(doc_type=docType, status='error').inc()
        http_errors_total.labels(status_code='500', endpoint='/ocr/scan').inc()
        print(f"Erreur OCR: {e}")
        raise HTTPException(500, f"Erreur OCR: {str(e)}")
    # ─────────────────────────────────────────────────────

    parsed = parse_document(lines, docType)
    all_tokens = [it["text"] for it in items_sorted]

    print(f"\nResultat : {json.dumps(parsed, ensure_ascii=False, indent=2)}")
    print('=' * 55)

    try:
        fp.unlink()
    except:
        pass

    return {
        "success": True,
        "ocrDocumentId": doc_id,
        "allTokens": all_tokens,
        "parsedData": parsed,
        "confidence": round(conf, 3),
        "docType": docType,
    }


# ══════════════════════════════════════════════════════════
#   FONCTIONS UTILITAIRES
# ══════════════════════════════════════════════════════════

def extract_items(result_list):
    items, scores = [], []
    try:
        for page in result_list:
            if page is None:
                continue
            texts, sc, polys = None, None, []
            if hasattr(page, 'get'):
                texts = page.get('rec_texts', [])
                sc = page.get('rec_scores', [])
                polys = page.get('rec_polys', page.get('dt_polys', []))
            if not texts:
                try:
                    texts = page['rec_texts']
                    sc = page['rec_scores']
                    polys = page.get('rec_polys', page.get('dt_polys', []))
                except:
                    pass
            if texts:
                for idx, (t, c) in enumerate(zip(texts, sc or [0.0] * len(texts))):
                    t = str(t).strip()
                    if not t:
                        continue
                    cx, cy = 0, idx * 50
                    if polys and idx < len(polys):
                        try:
                            pts = polys[idx].tolist() if hasattr(polys[idx], 'tolist') else polys[idx]
                            cx = int(sum(p[0] for p in pts) / len(pts))
                            cy = int(sum(p[1] for p in pts) / len(pts))
                        except:
                            pass
                    items.append({"text": t, "cx": cx, "cy": cy, "score": float(c)})
                    scores.append(float(c))
    except Exception as e:
        print(f"Warn extract: {e}")
    return items, (sum(scores) / len(scores) if scores else 0.0)


def group_by_line(items_sorted, tolerance=30):
    lines = []
    for item in items_sorted:
        placed = False
        for line in lines:
            if abs(item["cy"] - line[0]["cy"]) <= tolerance:
                line.append(item)
                placed = True
                break
        if not placed:
            lines.append([item])
    for line in lines:
        line.sort(key=lambda x: x["cx"], reverse=True)
    return lines


def is_arabic(t):
    return bool(re.search(r'[\u0600-\u06FF]', t))


def line_text(line):
    return " ".join(it["text"] for it in line)


def is_laqab_line(line):
    return any(v in line_text(line) for v in LAQAB_VARS)


def is_ism_line(line):
    return any(v in line_text(line) for v in ISM_VARS)


def is_date_line(line):
    return any(v in line_text(line) for v in DATE_VARS)


def get_arabic_values(line, lines, idx, max_tokens=1):
    all_labels = LAQAB_VARS + ISM_VARS + DATE_VARS + [
        'الجمهورية', 'التونسية', 'بطاقة', 'التعريف', 'الوطنية',
        'ب لية', 'بلية', 'JL', 'ييلي', 'ربة', 'النونسية', 'الجمهو', 'لإليية',
        'ل ليين', 'رلية',
    ]
    ignore_tokens = ['بنت', 'بن', 'ابن', 'ابنة', 'بنة', 'ES', '2', 'لر', 'يي', 'لل']
    values = []
    search_lines = [line] + [lines[j] for j in range(idx + 1, min(idx + 3, len(lines)))]
    for search_line in search_lines:
        if search_line != line and (is_ism_line(search_line) or is_date_line(search_line)):
            break
        for it in search_line:
            t = it["text"].strip()
            if not t or len(t) < 3:
                continue
            if not is_arabic(t):
                continue
            if any(lbl in t for lbl in all_labels):
                continue
            if t in ignore_tokens:
                continue
            if re.match(r'^\d+$', t):
                continue
            if t in ['بنت', 'بن']:
                return values
            values.append(t)
            if len(values) >= max_tokens:
                return values
    return values


def parse_document(lines, doc_type):
    if doc_type == "CIN_RECTO":
        return parse_cin_recto(lines)
    if doc_type == "PASSPORT":
        return parse_passport(lines)
    return {}


def parse_cin_recto(lines):
    result = {}
    all_tokens = " ".join(line_text(l) for l in lines)

    m = re.search(r'(?<!\d)(\d{8})(?!\d)', all_tokens)
    if m:
        result["idCardNumber"] = m.group(1)
        print(f"  idCardNumber : {m.group(1)}")

    for i, line in enumerate(lines):
        if is_laqab_line(line) and not result.get("lastNameArabic"):
            vals = get_arabic_values(line, lines, i, max_tokens=1)
            if vals:
                result["lastNameArabic"] = vals[0]
                print(f"  lastNameArabic : {vals[0]}")
        elif is_ism_line(line) and not result.get("firstNameArabic"):
            vals = get_arabic_values(line, lines, i, max_tokens=1)
            if vals:
                result["firstNameArabic"] = vals[0]
                print(f"  firstNameArabic : {vals[0]}")
        elif is_date_line(line) and not result.get("birthDate"):
            d = extract_date_from_line(line, lines, i)
            if d:
                result["birthDate"] = d
                print(f"  birthDate : {d}")

    if not result.get("firstNameArabic") and result.get("lastNameArabic"):
        NOISE = {'بنت', 'بن', 'ابن', 'ابنة', 'بنة', 'لر', 'يي', 'لل', 'ES', '2'}
        ALL_LABELS = set(LAQAB_VARS + ISM_VARS + DATE_VARS + [
            'الجمهورية', 'التونسية', 'بطاقة', 'التعريف', 'الوطنية',
            'ب لية', 'بلية', 'JL', 'ييلي', 'ربة', 'النونسية', 'الجمهو',
            'لإليية', 'ل ليين', 'رلية', 'الجمهور',
        ])
        last_name = result["lastNameArabic"]
        found_last = False
        for line in lines:
            for it in line:
                t = it["text"].strip()
                if not t or len(t) < 3:
                    continue
                if not is_arabic(t):
                    continue
                if re.match(r'^\d+$', t):
                    continue
                if t in NOISE:
                    continue
                if any(lbl in t for lbl in ALL_LABELS):
                    continue
                if not found_last:
                    if t == last_name:
                        found_last = True
                    continue
                if t != last_name:
                    result["firstNameArabic"] = t
                    print(f"  firstNameArabic (fallback) : {t}")
                    break
            if result.get("firstNameArabic"):
                break

    if not result.get("birthDate"):
        year_m = re.search(r'\b(19\d{2})\b', all_tokens)
        if year_m:
            month = None
            for ar, num in MOIS_AR.items():
                if ar in all_tokens:
                    month = num
                    break
            year = year_m.group(1)
            day_m = re.search(r'\b(\d{1,2})\b(?=.*' + year + ')', all_tokens)
            day = day_m.group(1).zfill(2) if day_m else "??"
            if month:
                result["birthDate"] = f"{day}/{month}/{year}"
                print(f"  birthDate (fallback) : {day}/{month}/{year}")
            else:
                result["birthDate"] = f"??/??/{year}"
                print(f"  birthDate (annee) : {year}")

    return result


def extract_date_from_line(line, lines, idx):
    all_text = line_text(line)
    if idx + 1 < len(lines):
        all_text += " " + line_text(lines[idx + 1])
    if idx + 2 < len(lines):
        all_text += " " + line_text(lines[idx + 2])
    m = re.search(r'(\d{1,2})[\/\-\.](\d{2})[\/\-\.](\d{4})', all_text)
    if m:
        return f"{m.group(1).zfill(2)}/{m.group(2)}/{m.group(3)}"
    year = re.search(r'(19|20)\d{2}', all_text)
    day = re.search(r'\b(\d{1,2})\b', all_text)
    month = None
    for ar, num in MOIS_AR.items():
        if ar in all_text:
            month = num
            break
    if year and month:
        d = day.group(1).zfill(2) if day else "??"
        return f"{d}/{month}/{year.group()}"
    return None


def parse_passport(lines):
    result = {}
    text = " ".join(line_text(l) for l in lines)

    IGNORE = {
        "REPUBLIC", "TUNISIA", "PASSPORT", "TUNISIAN", "TUN", "P", "I",
        "TYPE", "CODE", "PLACE", "SEX", "DATE", "REPUBLIC OF TUNISIA",
        "OF", "TUNIS", "SLIMANE", "AUTHORITY", "ISSUING"
    }

    def is_name_val(t):
        t = t.strip()
        words = t.split()
        return (
            bool(re.match(r'^[A-Z][A-Z ]{1,}$', t)) and
            len(t.replace(" ", "")) >= 2 and t not in IGNORE and
            "/" not in t and len(words) <= 3 and "OF" not in words and
            all(len(w) >= 2 for w in words)
        )

    m = re.search(r'\b([A-Z]\d{6,7})\b', text)
    if m:
        result["idCardNumber"] = m.group(1)
        print(f"  N° Passeport : {m.group(1)}")

    passport_digits = re.sub(r'[^0-9]', '', result.get("idCardNumber", ""))
    all_8digit = re.findall(r'(?<!\d)(\d{8})(?!\d)', text)
    print(f"  Groupes 8 chiffres : {all_8digit}")

    for candidate in all_8digit:
        dd, mm, yy = int(candidate[0:2]), int(candidate[2:4]), int(candidate[4:8])
        if (1 <= dd <= 31) and (1 <= mm <= 12) and (1900 <= yy <= 2100):
            print(f"  {candidate} ignore (date)")
            continue
        if passport_digits and passport_digits in candidate:
            print(f"  {candidate} ignore (passeport)")
            continue
        result["nationalId"] = candidate
        print(f"  nationalId (CIN) : {candidate}")
        break

    if not result.get("nationalId"):
        print(f"  nationalId non trouve — candidats: {all_8digit}")

    surname_vars = ["Surname", "SURNAME", "Surnsme", "Surnama"]
    given_vars = ["Given names", "Given Names", "GIVEN NAME", "Given name"]

    for i, line in enumerate(lines):
        lt = line_text(line).strip()
        if any(v in lt for v in surname_vars) and not result.get("lastName"):
            for it in line:
                t = it["text"].strip()
                if is_name_val(t) and "Surname" not in t and "PASSPORT" not in t:
                    result["lastName"] = t
                    break
            if not result.get("lastName") and i + 1 < len(lines):
                lt_next = line_text(lines[i + 1]).strip()
                if is_name_val(lt_next) and "PASSPORT" not in lt_next:
                    result["lastName"] = lt_next
        if any(v in lt for v in given_vars) and not result.get("firstName"):
            for it in line:
                t = it["text"].strip()
                if is_name_val(t) and not any(v in t for v in given_vars):
                    result["firstName"] = t
                    break
            if not result.get("firstName") and i + 1 < len(lines):
                lt_next = line_text(lines[i + 1]).strip()
                if is_name_val(lt_next):
                    result["firstName"] = lt_next

    if not result.get("lastName") or not result.get("firstName"):
        for line in lines:
            lt = line_text(line).strip()
            if is_name_val(lt) and lt not in IGNORE:
                if not result.get("lastName"):
                    result["lastName"] = lt
                elif lt != result.get("lastName") and not result.get("firstName"):
                    result["firstName"] = lt
                    break
            else:
                for it in line:
                    t = it["text"].strip()
                    if is_name_val(t) and t not in IGNORE:
                        if not result.get("lastName"):
                            result["lastName"] = t
                        elif t != result.get("lastName") and not result.get("firstName"):
                            result["firstName"] = t
                            break

    print(f"  lastName={result.get('lastName')} firstName={result.get('firstName')}")

    dates_found = re.findall(r'(\d{2})[\-\/\.](\d{2})[\-\/\.](\d{4})', text)
    unique_dates, seen = [], set()
    for d in dates_found:
        ds = f"{d[0]}/{d[1]}/{d[2]}"
        if ds not in seen:
            seen.add(ds)
            try:
                y, mo, dy = int(d[2]), int(d[1]), int(d[0])
                if 1 <= mo <= 12 and 1 <= dy <= 31 and 1900 <= y <= 2100:
                    unique_dates.append((y, mo, dy, ds))
            except:
                pass

    unique_dates.sort(key=lambda x: (x[0], x[1], x[2]))
    for y, mo, dy, ds in unique_dates:
        if y < 2000 and "birthDate" not in result:
            result["birthDate"] = ds
            print(f"  birthDate -> {ds}")
        elif y >= 2000 and "idIssueDate" not in result:
            result["idIssueDate"] = ds
            print(f"  idIssueDate -> {ds}")
        elif y >= 2000 and "expiryDate" not in result:
            result["expiryDate"] = ds
            print(f"  expiryDate -> {ds}")

    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)