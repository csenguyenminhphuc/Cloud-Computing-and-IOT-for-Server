from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from collections import deque
import joblib
from typing import List, Union

app = FastAPI()

best_model = joblib.load("LogReg_model.pkl")

buffer = deque(maxlen=5)

class DataItem(BaseModel):
    _time: str
    _value: float
    _field: str

class InputData(BaseModel):
    data: List[DataItem]

def preprocess_realtime(df: pd.DataFrame, buffer: deque):
    df_wide = (df
               .assign(_time=pd.to_datetime(df["_time"]))
               .pivot_table(index="_time",
                            columns="_field",
                            values="_value",
                            aggfunc="first")
               .sort_index())
    df_wide.columns.name = None

    for _, row in df_wide.iterrows():
        buffer.append({
            "gas": row["gas"],
            "humidity": row["humidity"],
            "temperature": row["temperature"]
        })

    if len(buffer) < 5:
        return None

    df_buffer = pd.DataFrame(list(buffer))

    lagged_data = []
    for lag in range(21):
        idx = min(lag // 5, 4) 
        shifted = df_buffer.iloc[-1-idx][["gas", "humidity", "temperature"]]
        lagged_data.extend(shifted.values)

    columns = [f"{col}_-{lag}s" for lag in range(21) for col in ["gas", "humidity", "temperature"]]
    return pd.DataFrame([lagged_data], columns=columns)

@app.post("/predict")
async def predict(body: Union[InputData, List[dict]]):
    if isinstance(body, list):
        data = [{"_time": item["_time"], "_value": item["_value"], "_field": item["_field"]} for item in body]
    else:
        data = [item.dict() for item in body.data]

    df = pd.DataFrame(data)

    processed_data = preprocess_realtime(df, buffer)

    if processed_data is None:
        return {
            "status": "waiting",
            "message": "Not enough data (need 5 points)",
            "prediction": None,
            "probability_dangerous": None
        }

    try:
        prediction = best_model.predict(processed_data)[0]
        probability = best_model.predict_proba(processed_data)[0, 1] if hasattr(best_model, "predict_proba") else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

    return {
        "status": "success",
        "prediction": "Dangerous" if prediction == 1 else "Safe",
        "probability_dangerous": float("{:.2e}".format(probability)) if probability is not None else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="152.42.200.154", port=8001)