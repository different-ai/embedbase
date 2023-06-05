import { PrimaryButton } from '@/components/Button'
import { Input } from '@/components/Input'
import { CenteredLayout } from '@/components/Layout'
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useForm } from "react-hook-form"

type FormData = {
    username: string;
    // fullname: string;
    // avatar: string;
    // github: string;
    // homepage: string;
    // twitter: string;
    // details: string;
    // agreeTerms: boolean;
};

const CompleteProfile = ({ onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false)
    const { register, handleSubmit, formState, setError } = useForm<FormData>();
    const errors = formState.errors
    const supabase = useSupabaseClient()
    const user = useUser()

    const onSubmit = async (formData: FormData) => {
        setIsLoading(true)
        if (!user) throw new Error('No user')

        const {
            username,
            // fullname,
            // avatar,
            // github,
            // homepage,
            // twitter,
            // details,
            // agreeTerms,
        } = formData

        // check that this username is available

        let { data, error } = await supabase.from('profiles')
            .select('id')
            .eq('username', username)
            .neq('id', user.id)

        console.log(data)
        if (error) {
            console.log(error)
            setError('username', { message: error.message })
            throw error
        }

        if (data && data.length > 0) {
            console.log('username not available')
            setError('username', { message: 'username not available' })
            return 'username not available'
        }

        const updates = {
            id: user.id,
            username,
            // website,
            // avatar_url,
            updated_at: new Date().toISOString(),
        }

        let { error: error2 } = await supabase.from('profiles').upsert(updates)
        if (error2) throw error2

        onSuccess()
    };

    const wrapOnSubmit = (formData: FormData) => onSubmit(formData).catch(() => setIsLoading(false))

    return (
        <div className="pt-16  col-span-full flex-1 pb-16 md:pb-0">
            <div className="bg-white mx-auto z-10 max-w-xl rounded-xl border p-4 shadow">
                <div className="-mt-12 mb-2 mx-auto h-20 w-20 rounded-full bg-gradient-to-b from-blue-50 to-blue-200 ring ring-white"></div>
                <h1 className="pt-2 text-center text-3xl font-bold">Complete your profile</h1>
                <p className="mb-6 text-center text-gray-500">One last step to join the community</p>
                <form onSubmit={handleSubmit(wrapOnSubmit)}
                // className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5"
                >
                    <label className="block">Username
                        <Input
                            autoComplete="off"
                            className="form-input mt-1 block w-full"
                            maxLength={42}
                            minLength={2}
                            name="username"
                            // only letter and numbers
                            pattern="\b(?!\d+$)([a-zA-Z0-9]|-(?!-))+\b"
                            placeholder="your-username-123"
                            type="text"
                            {
                            ...register("username", {
                                required: true,
                                minLength: 2,
                                maxLength: 42,
                                pattern: {
                                    value: /\b(?!\d+$)([a-zA-Z0-9]|-(?!-))+\b/,
                                    message: "Username should only contain letters, numbers and dashes"
                                }
                            })
                            }
                        />
                        {
                            errors.username && <p className="text-red-500 italic">{errors.username.message}</p>
                        }
                    </label>

                    {/* <label className="block">Full name
                        <Input
                            autoComplete="name"
                            className="form-input mt-1 block w-full"
                            name="fullname"
                            placeholder="Full name"
                            type="text"
                            {
                            ...register("fullname", {
                                required: true,
                                minLength: 2,
                                maxLength: 42,
                            })
                            }
                        />
                    </label> */}
                    {/* <div className="block">Avatar
                        <span className="pl-2 text-gray-400">(optional)</span>
                        <label className="mt-1 flex flex-col items-center">
                            <Input
                                accept="image/png, image/jpeg"
                                className="sr-only"
                                name="avatar"
                                type="file"
                                {
                                ...register("avatar", {
                                    required: false,
                                    pattern: {
                                        value: /image\/(png|jpeg)/,
                                        message: "Entered value does not match image format"
                                    }
                                })
                                }
                            />
                        </label>
                    </div> */}
                    {/* <label className="block">GitHub username
                        <span className="pl-2 text-gray-400">(optional)</span>
                        <Input
                            className="form-input mt-1 block w-full"
                            name="github"
                            pattern="[a-zA-Z\d-]+"
                            placeholder="GitHub username"
                            type="text"
                            {
                            ...register("github", {
                                required: false,
                                pattern: {
                                    value: /[a-zA-Z\d-]+/,
                                    message: "Entered value does not match GitHub username format"
                                }
                            })
                            }
                        />
                    </label> */}
                    {/* <label className="block">Homepage
                        <span className="pl-2 text-gray-400">(optional)</span>
                        <Input
                            className="form-input mt-1 block w-full"
                            name="homepage"
                            placeholder="Homepage"
                            type="url"
                            {
                            ...register("homepage", {
                                required: false,
                                pattern: {
                                    value: /\S+@\S+\.\S+/,
                                    message: "Entered value does not match email format"
                                }
                            })
                            }
                        />
                    </label> */}
                    {/* <label className="block">Twitter username
                        <span className="pl-2 text-gray-400">(optional)</span>
                        <Input
                            className="form-input mt-1 block w-full"
                            name="twitter"
                            pattern="[a-zA-Z\d_]+"
                            placeholder="Twitter account"
                            type="text"
                            {
                            ...register("twitter", {
                                required: false,
                                pattern: {
                                    value: /[a-zA-Z\d_]+/,
                                    message: "Entered value does not match Twitter username format"
                                }
                            })
                            }
                        />
                    </label> */}
                    {/* <label className="md:col-span-2 block">Research interests
                        <span className="pl-2 text-gray-400">(optional)</span>
                        <TextArea
                            className="form-textarea mt-1 block w-full"
                            cols={3}
                            rows={3}
                            name="details"
                            placeholder="Research interests"
                            {
                            ...register("details", {
                                required: false,
                                minLength: 2,
                                maxLength: 280,
                            })
                            }
                        ></TextArea>
                    </label> */}
                    {/* <label className="inline-flex items-center md:col-span-2">
                        <Input
                            autoComplete="off"
                            className="form-checkbox"
                            name="agreeTerms"
                            type="checkbox"
                            {
                            ...register("agreeTerms", {
                                required: true
                            })
                            }
                        />
                        <span className="ml-2 text-gray-600">
                            I have read and agree with the <a href="/terms-of-service" target="_blank" className="underline">Terms of Service</a> and the <a href="/code-of-conduct" target="_blank" className="underline">Code of Conduct</a>
                        </span>
                    </label> */}
                    {/* {errors.agreeTerms && (
                        <p className="text-red-500 col-span-full">
                            You must agree to the terms and conditions.
                        </p>
                    )} */}
                    {/* align center */}
                    <div className="col-span-full flex justify-center mt-5">
                        <PrimaryButton
                            type="submit"
                            className="btn btn-lg w-full py-2 text-center flex justify-center"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading ...' : 'Create Account'}
                            <ArrowRightCircleIcon
                                className="-mr-1 ml-1.5 h-5 w-5 "
                                aria-hidden="true"
                            />
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div >
    );
};



const Index = () => {
    const router = useRouter()
    const handleNext = async () => {
        await router.push('/dashboard')
    }

    return (
        <div>
            <CenteredLayout>
                <CompleteProfile onSuccess={handleNext} />
            </CenteredLayout>
        </div>
    )
}

export default Index
