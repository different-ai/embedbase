import { PrimaryButton } from '@/components/Button'
import { Input, Label } from '@/components/Input'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

function uploadFile(
  url: string,
  file: FormData,
  setUploadProgress: (progress: number) => void
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', url, true) // Replace "POST" with the appropriate method if needed

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100
        console.log(`Uploaded ${event.loaded} of ${event.total} bytes`)
        setUploadProgress(progress)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText)
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Request failed'))
    }

    xhr.send(file)
  })
}

export default function FileDataLoader() {
  const { push } = useRouter()
  const { register, handleSubmit, watch, formState, setValue } = useForm()
  const isLoading = formState.isSubmitting
  const datasetId = watch('datasetId')
  const file = watch('file')
  const isSubmitDisabled = !watch('datasetId') || isLoading

  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const onSubmit = async ({ file }: FieldValues) => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file[0])
    formData.append('datasetId', datasetId)

    setValue('file', '')
    toast.loading(`Adding file to embedbase in dataset "${datasetId}"`, {
      position: 'bottom-center',
      duration: 5000,
    })
    setUploading(true)

    try {
      setUploadProgress(0)
      await uploadFile('/api/uploadFile', formData, (e) => {
        setUploadProgress(e)
        if (e === 100) {
          push(`/dashboard/playground?datasetId=${datasetId}&new=true`)
        }
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error(`Error uploading file: ${error}`, {
        position: 'bottom-center',
        duration: 5000,
      })
    } finally {
      setUploadProgress(0)
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-3 ">
          <div className="col-span-full">
            <div className=" border-1  flex w-[250px] rounded-lg border bg-white py-4 px-8">
              <div className="w-full text-center">
                <div className=" flex text-sm leading-6 text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative w-full cursor-pointer truncate rounded-md font-semibold text-gray-900 focus-within:outline-none focus-within:ring-2 "
                  >
                    <span
                      className=" w-full"
                      title={
                        file?.length
                          ? file?.[0]?.name
                          : 'Click here to select a PDF'
                      }
                    >
                      {file?.length
                        ? file?.[0]?.name
                        : 'Click here to select a PDF'}
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      disabled={uploading}
                      {...register('file', {
                        required: true,
                      })}
                    />
                  </label>
                  {/* button to remove file top right */}
                  {file?.length ? (
                    <button
                      className="ml-3 rounded-md bg-white text-gray-400 hover:text-gray-500"
                      type="button"
                      onClick={() => setValue('file', '')}
                      disabled={uploading}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-gray-600">
                  PDF up to 10MB
                </p>
              </div>
            </div>
          </div>
          {/* vertical center */}
          <div className="flex   items-end justify-end gap-3">
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
              className="mt-3m flex h-min w-full items-center justify-center "
              type="submit"
              disabled={isSubmitDisabled}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <span>Importing {uploadProgress.toFixed(0)}%</span>
                </div>
              ) : (
                'Import to Embedbase'
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  )
}
