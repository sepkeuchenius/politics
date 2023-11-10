from utils import COLLECTION, FIRESTORE_DB
# from firebase_admin.firestore import FieldFilter

batch = FIRESTORE_DB.batch()
docs = []
if input("are you sure you want to delete all 2021 programs? (y/n)") == "y":
    for doc in COLLECTION.where("year", "==", "2021").stream():
        docs.append(doc)
        batch.delete(doc.reference)
    batch.commit()