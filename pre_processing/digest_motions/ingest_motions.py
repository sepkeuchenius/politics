from utils import COLLECTION, FIRESTORE_DB
from os import listdir
import json

DOC_LIMIT = 1000

batch = FIRESTORE_DB.batch()
print("started batch")

current_doc = 0
for filename in listdir("pre_processing/data/motions"):
    current_doc += 1
    with open(f"pre_processing/data/motions/{filename}") as file:
        motion: dict = json.load(file)
        doc = COLLECTION.document(motion.get("Id"))
        print("added doc to batch")
        batch.set(doc, motion)
        if current_doc == DOC_LIMIT:
            batch.commit()
            batch = FIRESTORE_DB.batch()
            current_doc = 0


batch.commit()
