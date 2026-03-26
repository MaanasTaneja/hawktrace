from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from concurrent.futures import ThreadPoolExecutor
import traceback
import uuid
from time import sleep

router = APIRouter(prefix="/pipeline")

jobs_kv_store = {}
# in memory kv store to store our jobs, can switch to redis or something similar later, at scale.

executor = ThreadPoolExecutor(max_workers=4)
#for our geneation piepline we need non blocking threads.


class GenerateRequest(BaseModel):
    prompt: str


def _generate_visuals(client, prompt: str) -> str:
    video_url = submit_retrieve_video_task(client, prompt=prompt)
    return download_video_from_runway(video_url)  # return the tmp file name


def _generate_audio(elevenlabs_client, prompt: str) -> str:
    sleep(100)


def _run_pipeline(job_id: str):
    try:
        jobs_kv_store[job_id]["status"] = "script"

        jobs_kv_store[job_id]["status"] = "task1"
        #task1 fucntion to run .

        jobs_kv_store[job_id]["status"] = "task2"
        #task2 unciton to run

        jobs_kv_store[job_id]["status"] = "task3"

        jobs_kv_store[job_id]["status"] = "done"
        jobs_kv_store[job_id]["url"] = video_filename

    except Exception as e:
        jobs_kv_store[job_id]["status"] = "failed"
        jobs_kv_store[job_id]["error"] = str(e)


@router.post("/generate")
#not decided whayt our generate request will look like?
def analyze_webpage(body: GenerateRequest, request: Request):
    job_id = f"job_{uuid.uuid4()}"
    #create job id here.
    jobs_kv_store[job_id] = {"status": "starting", "url": None, "error": None}
    #need to execute the pipeline in another thread, the run piepline funciton is. blocking
    #and will execute and keep chaning status of our job as we progress through pieplien
    #we track status through the job key value store. 

    executor.submit(_run_pipeline, job_id)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
def get_video_status(job_id: str):
    if job_id not in jobs_kv_store:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_kv_store[job_id]
