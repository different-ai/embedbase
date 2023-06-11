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
  const {
    register,
    handleSubmit,
    watch,
    formState,
    setValue,
    setError,
    reset,
  } = useForm()
  const errors = formState.errors
  const isLoading = formState.isSubmitting
  const datasetId = watch('datasetId')
  const file = watch('file')
  const isSubmitDisabled = !watch('datasetId') || isLoading

  const [uploading, setUploading] = useState(false)

  const onSubmit = async ({ file }: FieldValues) => {
    const singleFile = file[0]
    if (!singleFile) return
    if (singleFile.type !== 'application/pdf') {
      setError('selectedfile', {
        type: 'filetype',
        message: 'Only PDFs are valid.',
      })
      return
    }
    // limits disabled in dev to make it easy to process data
    if (singleFile.size > 3145728 && process.env.NODE_ENV !== 'development') {
      setError('selectedfile', {
        type: 'filesize',
        message: 'We only support PDFs up to 3MB',
      })
      return
    }
    const formData = new FormData()
    formData.append('file', singleFile)
    formData.append('datasetId', datasetId)

    setValue('file', '')
    toast.loading(`Adding file to embedbase in dataset "${datasetId}"`, {
      position: 'bottom-center',
      duration: 5000,
    })
    setUploading(true)

    try {
      await uploadFile('/api/uploadFile', formData, (e) => {
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
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
        <div className="sm:flex gap-3 ">
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
                  {file?.length ? (
                    <button
                      className="ml-3 rounded-md bg-white text-gray-400 hover:text-gray-500"
                      type="button"
                      onClick={() => {
                        setValue('file', '')
                        reset()
                      }}
                      disabled={uploading}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-gray-600">PDF up to 3MB</p>
              </div>
            </div>

            <span className=" text-xs text-gray-600">
              {/* @ts-ignore */}
              {errors?.selectedfile?.message}
            </span>
          </div>
          {/* vertical center */}
          <div className="flex   items-end justify-end gap-3">
            <div>
              <Label htmlFor="datasetId">Name your import</Label>
              <Input
                type="search"
                placeholder="my-dataset-id"
                {...register('datasetId', {
                  required: true,
                  pattern: /^[a-z\-]+$/i,
                })}
              />
              {errors.datasetId?.type === 'pattern' && (
                <span className="text-xs text-gray-500">
                  You can only have letters and hyphens
                </span>
              )}
            </div>
            <PrimaryButton
              // center children horizontal
              className="mt-3m flex h-min w-full items-center justify-center "
              type="submit"
              disabled={isSubmitDisabled}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <span>Uploading...</span>
                </div>
              ) : (
                'Import PDF'
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  )
}
