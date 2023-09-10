import dotenv
from os import getenv
import openai

dotenv.load_dotenv(".env")
OPEN_AI_TOKEN = getenv("OPEN_AI_TOKEN")

openai.api_key = OPEN_AI_TOKEN

openai.Model.list()


embedding = openai.Embedding.create(model = "davinci-similarity", input="test")
print(embedding)