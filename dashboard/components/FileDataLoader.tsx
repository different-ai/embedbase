import { PrimaryButton } from '@/components/Button'
import { Input } from '@/components/Input'
import { CheckCircleIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

function uploadFile(url: string, file: FormData, setUploadProgress: (progress: number) => void) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", url, true); // Replace "POST" with the appropriate method if needed

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                console.log(`Uploaded ${event.loaded} of ${event.total} bytes`);
                setUploadProgress(progress);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.responseText);
            } else {
                reject(new Error(`Request failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error("Request failed"));
        };

        xhr.send(file);
    });
}

async function fetchWithProgress(url: string, options: RequestInit, setUploadProgress: (progress: number) => void) {
    const response = await fetch(url, {
        ...options,
        signal: new AbortController().signal, // Required to use the fetch API with progress tracking
    });

    const reader = response.body.getReader();
    const contentLength = +response.headers.get("Content-Length");
    let receivedLength = 0;

    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        const progress = (receivedLength / contentLength) * 100;
        console.log(`Received ${receivedLength} of ${contentLength} bytes`);
        setUploadProgress(progress);
    }

    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }

    return new Response(chunksAll, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}

export default function FileDataLoader() {
    const { push } = useRouter()
    const { register, handleSubmit, watch, formState, setValue } = useForm()
    const isLoading = formState.isSubmitting
    const datasetId = watch('datasetId')
    // const file = watch("file");

    const isSubmitDisabled = !watch('datasetId') || isLoading

    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    console.log(uploadProgress);

    // console.log(file);
    const onSubmit = async ({ file }: FieldValues) => {
        console.log(file);
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file[0]);
        formData.append("datasetId", datasetId);

        setValue('file', '')
        toast.success(`Adding file to embedbase in dataset "${datasetId}"`, {
            position: 'bottom-center',
            duration: 5000
        })
        setUploading(true);

        try {
            setUploadProgress(0);
            // await fetchWithProgress("/api/uploadFile", {
            //     method: "POST",
            //     body: formData,
            // }, (e) => setUploadProgress(e));
            await uploadFile("/api/uploadFile", formData, (e) => setUploadProgress(e));
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Error uploading file: ${error}`, {
                position: 'bottom-center',
                duration: 5000
            })
        } finally {
            setUploadProgress(0);
            setUploading(false);
        }
        // push(`/dashboard/playground?datasetId=${datasetId}&new=true`)

    };



    return (
        <div className="flex flex-col gap-3">
            {/* <p className="text-gray-500 font-semibold text-sm sm:col-span-2 sm:mt-0">
                Add files to an embedbase dataset.
            </p> */}
            <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex gap-3 ">
                    <div className="col-span-full">
                        <label htmlFor="cover-photo" className="block text-sm font-medium leading-6 text-gray-900">
                            Add files to an embedbase dataset
                        </label>
                        <div className="mt-2 flex  rounded-lg ">
                            <div className="text-center">
                                <DocumentIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative cursor-pointer rounded-md  font-semibold text-gray-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                    >
                                        <span>Upload a file</span>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="sr-only"
                                            disabled={uploading}
                                            {...register('file', {
                                                required: true,
                                            })}
                                        />
                                    </label>
                                    {/* <p className="pl-1">or drag and drop</p> */}
                                </div>
                                <p className="text-xs leading-5 text-gray-600">PDF up to 10MB</p>
                            </div>
                        </div>
                    </div>
                    {/* vertical center */}
                    <div className="flex flex-col gap-3 justify-end">
                        <Input
                            type="search"
                            placeholder="my-dataset-id"
                            {...register('datasetId', { required: true })}
                        />
                        <PrimaryButton
                            // center children horizontal
                            className="w-full flex items-center justify-center"
                            type="submit" disabled={isSubmitDisabled} >
                            {
                                uploading && uploadProgress >= 100 ?
                                    <CheckCircleIcon
                                        className="h-5 w-5" viewBox="0 0 24 24" />
                                    :
                                    uploading ?
                                        <div className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24">

                                            </svg>
                                            <span>Uploading {uploadProgress.toFixed(0)}%</span>
                                        </div>
                                        : "Upload"}
                        </PrimaryButton>
                    </div>
                </div>
            </form>
        </div>
    )
}