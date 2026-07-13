import pdfplumber

def extract_cv_data(pdf_path: str):
    chunks = []
    metadata = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text:
                chunks.append(text)
                metadata.append({"page": f"Page {page_num}"})
            
    return chunks, metadata