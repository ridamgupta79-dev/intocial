import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification


MODEL_PATH = "models/distilbert-crisisbench"

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.to(device)
model.eval()


def predict_post(text: str) -> dict:
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.no_grad():
        outputs = model(**inputs)

    probabilities = torch.softmax(
        outputs.logits,
        dim=-1
    )

    predicted_class = probabilities.argmax().item()
    confidence = probabilities[0, predicted_class].item()

    return {
        "prediction": model.config.id2label[predicted_class],
        "confidence": round(float(confidence), 4)
    }