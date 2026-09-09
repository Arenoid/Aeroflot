from fastapi import FastAPI

app = FastAPI(
    title = "Drone Mission Planner API",
    version="0.1.67",
)

@app.get("/health")
def health_check():
    return{
        "status": "Working Good",
        "service": "drone-sar-planner"
    }

@app.get("/secret")
def secret():
    return{
        "status": "What is there is see -_-",
        "message": "Get back to work"
    }