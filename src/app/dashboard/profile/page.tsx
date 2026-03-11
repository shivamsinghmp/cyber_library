import { ToggleProfileForm } from "@/components/ToggleProfileForm";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-[var(--cream)] md:text-2xl">
        Profile
      </h1>
      <ToggleProfileForm />
    </div>
  );
}
