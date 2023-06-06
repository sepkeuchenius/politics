import fitz
import json
doc = fitz.open("Verkiezingsprogramma-VVD-2021-2025.pdf")
pars = []
for x in doc.pages():
    text = x.get_text("blocks")
    # pars=text.split("▶")
    # for par in pars:
    par_text = text[2][4]
    pars.append(par_text)


with open("vvd-pars.json", "w+") as file:
    json.dump(pars, file, indent=2)