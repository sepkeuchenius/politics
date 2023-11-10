import json
from utils import COLLECTION, FIRESTORE_DB
from typing import List

batch = FIRESTORE_DB.batch()

party = input("which party to ingest?: ")
with open(f"pre_processing/out/2023/{party}.json") as party_program_file:
    pars: List[dict] = json.load(party_program_file)
    for index, par in enumerate(pars):
        doc = COLLECTION.document(f"2023-{party}-{par.get('index')}")
        batch.set(doc, par)
        if index % 300 == 0:
            batch.commit()
            batch = FIRESTORE_DB.batch()
batch.commit()