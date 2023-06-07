import { PrimaryButton, SecondaryButton } from './Button';
import Link from 'next/link';

export function AuthButtons() {
  return (
    <>
      <Link href="/login">
        <SecondaryButton className="ml-3">Login</SecondaryButton>
      </Link>
      <Link href="/signup">
        <PrimaryButton className="ml-3">Signup</PrimaryButton>
      </Link>
    </>
  );
}
