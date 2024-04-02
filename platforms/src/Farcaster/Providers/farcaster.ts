// ----- Types
import { type Provider, type ProviderOptions } from "../../types";
import type { RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";

// ----- Libs
import axios from "axios";

// ----- Credential verification
import { getAddress } from "../../utils/signer";

// ----- Utils
import { handleProviderAxiosError } from "../../utils/handleProviderAxiosError";

const FARCASTER_ATTESTER = "0x372082138ea420eBe56078D73F0359D686A7E981";
export const BASE_EAS_SCAN_URL = "https://arbitrum.easscan.org/graphql";
export const VERIFIED_ACCOUNT_SCHEMA = "0xca168d038c5d527bb9724b3201f026520b498d334a2f3f446181d6420d7fb515";

// subgraphs to check
export const farcasterSubgraphs = [BASE_EAS_SCAN_URL];

export type Attestation = {
  recipient: string;
  revocationTime: number;
  revoked: boolean;
  expirationTime: number;
  schema: {
    id: string;
  };
  decodedDataJson: string;
};

export type EASQueryResponse = {
  data?: {
    data?: {
      attestations: Attestation[];
    };
  };
};

export class FarcasterProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "Farcaster";

  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  // Verify that address defined in the payload has already been attested
  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    // if a signer is provider we will use that address to verify against
    const address = await getAddress(payload);

    const errors: string[] = [];

    const valid = await verifyFarcasterAttestation(address);

    if (!valid) {
      errors.push(`We could not find a Farcaster-verified onchain attestation for your address: ${address}.`);
    }

    return {
      valid,
      errors,
      record: { address },
    };
  }
}

export const verifyFarcasterAttestation = async (address: string): Promise<boolean> => {
  const query = `
    query Attestations {
      attestations(
        where: {
          schemaId: { equals: "${VERIFIED_ACCOUNT_SCHEMA}" },
          attester: { equals: "${FARCASTER_ATTESTER}" },
          recipient: { equals: "${address}" }
        }
      ) {
        id
        attester
        recipient
        refUID
        revocable
        revocationTime
        revoked
        expirationTime
        data
        schema {
          id
        }
      }
    }
  `;

  let result: EASQueryResponse;
  try {
    result = await axios.post(BASE_EAS_SCAN_URL, {
      query,
    });
  } catch (e) {
    handleProviderAxiosError(e, "Farcaster attestation", []);
  }

  const validAttestations = (result?.data?.data?.attestations || []).filter(
    (attestation) =>
      attestation.revocationTime === 0 &&
      attestation.expirationTime === 0 &&
      attestation.schema.id === VERIFIED_ACCOUNT_SCHEMA
  );

  return validAttestations.length > 0;
};
