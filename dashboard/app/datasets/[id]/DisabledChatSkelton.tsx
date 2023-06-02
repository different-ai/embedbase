import { PrimaryButton } from '@/components/Button';
import { ChatBox } from '@/components/ChatBox';
import { Footer } from '@/components/Footer';
import { TextArea } from '@/components/Input';
import { SubmitIcon } from '@/components/SubmitIcon';
import { UseInSdkButton } from './DataTable';

export function DisabledChatSkelton() {
    return <div className="w-full">
        <div className="gap-4 rounded-t-lg bg-gray-50 p-2 ">
            <div className="flex h-[200px] flex-col gap-3 space-y-2 overflow-y-auto p-2">
                <div>
                    <ChatBox>Coming Soon</ChatBox>
                </div>
            </div>
        </div>
        <div>
            <div className="rounded-b-lg bg-gray-50 p-8 ">
                <form className="flex">
                    <TextArea
                        disabled={true}
                        rows={4}
                        type="text"
                        id="userInput"
                        name="userInput"
                        placeholder={'coming soon'}
                        className="w-full border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring focus:ring-transparent" />
                    <PrimaryButton
                        type="submit"
                        disabled={true}
                        className="ml-3 rounded-md bg-black px-4 py-2"
                    >
                        <SubmitIcon />
                    </PrimaryButton>
                </form>
                <Footer />
            </div>
        </div>
    </div>;
}
