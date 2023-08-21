from utils import COLLECTION
from os import listdir
import json

for filename in listdir("data/motions"):
    with open(f"data/motions/{filename}") as file:
        motion:dict = json.load(file)
        COLLECTION.document(motion.get('Id')).set(motion)