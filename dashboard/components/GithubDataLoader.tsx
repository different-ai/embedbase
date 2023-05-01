import { PrimaryButton } from '@/components/Button'
import { Input } from '@/components/Input'
import { getRepoName } from '@/lib/github'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

export function GithubDataLoader() {
    const { push } = useRouter()
    const { register, handleSubmit, watch, formState, setValue } = useForm({
        defaultValues: { type: 'github', githubRepo: '', sourceCode: '' },
    })
    const isLoading = formState.isSubmitting
    const [isRepositoryValid, setIsRepositoryValid] = useState(false)
    const githubRepo = watch('githubRepo')

    useEffect(() => {
        // check if repo is valid by making a request to it
        if (githubRepo) {
            fetch('/api/checkGithub', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ repositoryUrl: githubRepo }),
            }).then((res) => {
                if (res.status === 200) {
                    setIsRepositoryValid(true)
                }
            }).catch((err) => {
                console.log('err', err)
                setIsRepositoryValid(false)
            })
        }
    }, [githubRepo])


    const handleUpload = async ({ githubRepo }: FieldValues) => {
        console.log('indexing', githubRepo)
        // empty the input
        setValue('githubRepo', '')
        const datasetId = getRepoName(githubRepo);
        toast.success(`Adding repository to embedbase in dataset ${datasetId}`, {
            position: 'bottom-center',
            duration: 5000
        })
        fetch('/api/syncGithub', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: githubRepo }),
        }).catch((err) => toast.error('Error adding repository to embedbase'))
        push(`/dashboard/playground?datasetId=${datasetId}&new=true`)
    }
    const isSubmitDisabled = !watch('githubRepo') || !isRepositoryValid || isLoading

    return (
        <div className="flex flex-col gap-3">
            <p className="text-gray-500 text-sm sm:col-span-2 sm:mt-0">
                Import data without code. Drop a public GitHub repository
                URL in the bar.

                We will automatically import this repository into a dataset in Embedbase.
            </p>
            <form className="w-full" onSubmit={handleSubmit(handleUpload)}>
                <div className="relative mt-1 rounded-md gap-3">
                    <div className="flex gap-3">
                        <Input
                            type="search"
                            className="w-1/2"
                            placeholder="https://github.com/different-ai/embedbase"
                            {...register('githubRepo', { required: true })}
                        />
                        <PrimaryButton type="submit" disabled={isSubmitDisabled} >
                            {isLoading ? 'Loading...' : 'Load Repository'}
                        </PrimaryButton>
                    </div>
                    {/* display a small message telling whether the repo is correct */}
                    {/* fixed height size */}
                    <div className="flex flex-col justify-center h-6">
                        <div className="text-sm text-gray-500">
                            {!watch('githubRepo')
                                ? ''
                                : // check if the repo exists
                                isRepositoryValid
                                    ? ''
                                    : 'Repository does not exist or is private'}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}