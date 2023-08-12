from firebase_admin import credentials, firestore, initialize_app
from utils import DOCS, PARS
import json

cred = credentials.Certificate("politics-navigator-firebase-adminsdk-sqgcn-91f34c3f50.json")
initialize_app(cred)

firestore_db = firestore.client()
collection = firestore_db.collection('parties')
docs =  list(collection.list_documents())

if input(f"About to remove {len(docs)} documents. Are you sure?") == "y":
    for doc in docs:
        doc.delete()

for party in PARS:
    with open(PARS[party]) as f:
        pars = json.load(f)
        if input(f"About to ingest {len(pars)} paragraphs. Are you sure?") == "y":
            for index, par in enumerate(pars):
                collection.add({"text": par, "index":index, "party": party})