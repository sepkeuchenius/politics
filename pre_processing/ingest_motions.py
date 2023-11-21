from utils import COLLECTION, FIRESTORE_DB
from os import listdir
import json

DOC_LIMIT = 1000

batch = FIRESTORE_DB.batch()
print("started batch")

current_doc = 0
current_batch = 1
for filename in listdir("data/motions"):
    current_doc += 1
    with open(f"data/motions/{filename}") as file:
        print(f"precessing file {filename}")
        motion: dict = json.load(file)

        doc = COLLECTION.document(motion.get('Id'))
        doc_ref = doc.get()

        if doc_ref.exists:
            batch.update(doc, motion)
            print("added update doc to batch")
        else:
            batch.set(doc, motion)
            print("added doc to batch")

        if current_doc == DOC_LIMIT:
            batch.commit()
            batch = FIRESTORE_DB.batch()
            current_doc = 0
            print(f"commited batch no {current_batch}")
            current_batch += 1

batch.commit()
