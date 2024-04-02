import { PlatformSpec, PlatformGroupSpec, Provider } from "../types";
import { FarcasterProvider } from "./Providers/farcaster";

export const PlatformDetails: PlatformSpec = {
  icon: "./assets/farcasterLogoIcon.svg",
  platform: "Farcaster",
  name: "Farcaster",
  description: "Verify Your Farcaster Account & Onchain Identity",
  website: "https://farcaster.xyz/",
  connectMessage: "Verify Account",
  isEVM: true,
};

export const ProviderConfig: PlatformGroupSpec[] = [
  {
    platformGroup: "Account & Onchain Identity",
    providers: [
      {
        title: "Privacy-First Verification",
        description:
          "Your privacy is paramount. We only retain your Farcaster ID to acknowledge your account's verification.",
        name: "Farcaster",
      },
    ],
  },
];

export const providers: Provider[] = [new FarcasterProvider()];
