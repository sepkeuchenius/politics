import requests
import fitz

docs = requests.get("https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Document?$filter=Soort%20eq%20%27Motie%27&$orderby=DocumentNummer%20asc").json()

for doc in docs["value"]:
    pdf_content = requests.get(f"https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Document({doc['Id']})/resource").content
    pdf_document = fitz.open(stream=pdf_content)
    if len(list(pdf_document.pages())) > 1:
        print("greater than 1")
    first_page = next(pdf_document.pages())
    first_page_text = first_page.get_text()