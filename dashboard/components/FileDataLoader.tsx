import { PrimaryButton } from '@/components/Button'
import { Input, Label } from '@/components/Input'
import { XMarkIcon } from '@heroicons/react/24/outline'
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


export default function FileDataLoader() {
    const { push } = useRouter()
    const { register, handleSubmit, watch, formState, setValue } = useForm()
    const isLoading = formState.isSubmitting
    const datasetId = watch('datasetId')
    const file = watch("file");
    const isSubmitDisabled = !watch('datasetId') || isLoading

    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);


    const onSubmit = async ({ file }: FieldValues) => {
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
            await uploadFile("/api/uploadFile", formData, (e) => {
                setUploadProgress(e)
                if (e === 100) {
                    push(`/dashboard/playground?datasetId=${datasetId}&new=true`)
                }
            });

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

    };



    return (
        <div className="flex flex-col gap-3">
            <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex gap-3 ">
                    <div className="col-span-full">
                        <div className=" flex  rounded-lg border border-1 py-4 px-8 bg-white w-[250px]">
                            <div className="text-center w-full">
                                <div className=" flex text-sm leading-6 text-gray-600">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative truncate w-full cursor-pointer rounded-md font-semibold text-gray-900 focus-within:outline-none focus-within:ring-2 "
                                    >
                                        <span className=' w-full'

                                            title={
                                                file?.length ?
                                                    file?.[0]?.name :
                                                    'Click here to select a PDF'
                                            }
                                        >
                                            {
                                                file?.length ?
                                                    file?.[0]?.name :
                                                    'Click here to select a PDF'
                                            }
                                        </span>
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
                                    {/* button to remove file top right */}
                                    {
                                        file?.length ?
                                            <button
                                                className="ml-3 bg-white rounded-md text-gray-400 hover:text-gray-500"
                                                type="button"
                                                onClick={() => setValue('file', '')}
                                                disabled={uploading}
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button> : null
                                    }
                                </div>
                                <p className="text-xs leading-5 text-gray-600">PDF up to 10MB</p>
                            </div>
                        </div>
                    </div>
                    {/* vertical center */}
                    <div className="flex   justify-end gap-3 items-end">
                        <div>
                            <Label htmlFor="datasetId">Name your import</Label>
                            <Input
                                type="search"
                                placeholder="my-dataset-id"
                                {...register('datasetId', { required: true })}
                            />
                        </div>
                        <PrimaryButton
                            // center children horizontal
                            className="w-full flex items-center justify-center mt-3m h-min "
                            type="submit" disabled={isSubmitDisabled} >
                            {

                                uploading ?
                                    <div className="flex items-center gap-2">
                                        <span>Importing {uploadProgress.toFixed(0)}%</span>
                                    </div>
                                    : "Import to Embedbase"}
                        </PrimaryButton>
                    </div>
                </div>
            </form>
        </div>
    )
}