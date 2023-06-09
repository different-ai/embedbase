import Image from 'next/image';
import Link from 'next/link';

const CommunityHubButton = () => {
  return(
    <Link href="/datasets">
    <div className="flex text-gray-800">
      <Image src="/Hub.svg" alt="hub icon" width={20} height={20} />
      <span>Community Hub</span>
    </div>
    </Link>
  );
};

export default  CommunityHubButton
