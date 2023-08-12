import fitz
import json
from firebase_admin import credentials, firestore, initialize_app
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


cred = credentials.Certificate("politics-navigator-firebase-adminsdk-sqgcn-d0346930db.json")
initialize_app(cred)

firestore_db = firestore.client()
collection = firestore_db.collection('parties')

for index, par in enumerate(pars):
    collection.add({"text": par, "index":index, "party": "vvd"})
