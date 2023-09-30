from utils import COLLECTION, FIRESTORE_DB
from os import listdir
import json

batch = FIRESTORE_DB.batch()
print("started batch")

for filename in listdir("pre_processing/data/motions"):
    with open(f"pre_processing/data/motions/{filename}") as file:
        motion:dict = json.load(file)
        doc = COLLECTION.document(motion.get('Id'))
        print("added doc to batch")
        batch.set(doc, motion)

batch.commit()