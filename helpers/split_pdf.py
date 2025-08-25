import os
import re
import glob
import PyPDF2
import pdfplumber

# Diretórios
INPUT_DIR    = r"C:\Dev\PROJETOS - NT STORE - LOJA\denario_acs\public"
OUTPUT_FOLDER = r"C:\Dev\PROJETOS - NT STORE - LOJA\denario_acs\public"


# Encontra todos os PDFs que comecem com "split_"
pattern = os.path.join(INPUT_DIR, "split_*.pdf")
candidates = glob.glob(pattern)

if not candidates:
    raise FileNotFoundError(f"Nenhum arquivo encontrado em {pattern}")

# Escolhe o mais recente por data de modificação
candidates.sort(key=lambda path: os.path.getmtime(path), reverse=True)
input_pdf_path = candidates[0]
print(f"Usando arquivo de entrada: {input_pdf_path}")

# Cria a pasta de saída se não existir
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def extract_nf_number(text):
    """Procura o número da NF-e no texto usando regex."""
    match = re.search(r"NF-e\s*Nº\s*(\d+)", text)
    return match.group(1) if match else None

def save_pdf(full_reader, nf_number, page_indexes):
    """Salva um novo PDF com as páginas corretas da NF-e."""
    writer = PyPDF2.PdfWriter()
    for index in page_indexes:
        writer.add_page(full_reader.pages[index])
    output_path = os.path.join(OUTPUT_FOLDER, f"NF_{nf_number}.pdf")
    with open(output_path, "wb") as out_pdf:
        writer.write(out_pdf)
    print(f"Salvo: {output_path}")

def split_pdf():
    with pdfplumber.open(input_pdf_path) as pdf:
        reader = PyPDF2.PdfReader(input_pdf_path)
        num_pages = len(reader.pages)

        current_nf    = None
        pages_buffer  = []

        for i in range(num_pages):
            page = pdf.pages[i]
            text = page.extract_text() or ""

            nf_number = extract_nf_number(text)
            if nf_number:
                if current_nf:
                    save_pdf(reader, current_nf, pages_buffer)
                current_nf   = nf_number
                pages_buffer = [i]
            else:
                if current_nf:
                    pages_buffer.append(i)

        # salva o último bloco
        if current_nf:
            save_pdf(reader, current_nf, pages_buffer)

    print("Processo concluído!")

if __name__ == "__main__":
    split_pdf()
