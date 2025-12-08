#!/usr/bin/env python3
import json
import random
import uuid
from datetime import datetime, timedelta

PATOLOGIAS = [
    "dolor_toracico", "traumatismo", "dolor_abdominal", "fiebre", "cefalea",
    "disnea", "mareo", "herida", "intoxicacion", "fractura", "quemadura",
    "alergia", "gastroenteritis", "lumbalgia", "ansiedad", "conjuntivitis",
    "otitis", "faringitis"
]

HOSPITALS = {
    "chuac": 0.6,
    "modelo": 0.2,
    "san_rafael": 0.2
}

def generate_patient(base_time):
    """Generate a single patient with random attributes."""
    return {
        "patient_id": str(uuid.uuid4()),
        "edad": random.randint(0, 100),
        "sexo": random.choice(["M", "F"]),
        "patologia": random.choice(PATOLOGIAS),
        "hospital_id": random.choices(
            list(HOSPITALS.keys()),
            weights=list(HOSPITALS.values())
        )[0],
        "hora_llegada": (base_time + timedelta(minutes=random.randint(0, 1440))).isoformat(),
        "factor_demanda": round(random.uniform(0.8, 1.5), 2)
    }

def generate_patients(count):
    """Generate a list of patients."""
    base_time = datetime.now()
    return [generate_patient(base_time) for _ in range(count)]

def main():
    # Generate 100 patients
    sample_patients = generate_patients(100)
    with open('/Volumes/Proyecto_Hugo/gemelo-digital-hospitalario/backend/samples/sample.json', 'w') as f:
        json.dump(sample_patients, f, indent=2)

    # Generate 2500 patients
    heavy_sample_patients = generate_patients(2500)
    with open('/Volumes/Proyecto_Hugo/gemelo-digital-hospitalario/backend/samples/heavy_sample.json', 'w') as f:
        json.dump(heavy_sample_patients, f, indent=2)

    print(f"Generated {len(sample_patients)} patients in sample.json")
    print(f"Generated {len(heavy_sample_patients)} patients in heavy_sample.json")

if __name__ == "__main__":
    main()
