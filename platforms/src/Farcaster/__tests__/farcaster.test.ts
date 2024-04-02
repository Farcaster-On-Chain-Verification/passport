/* eslint-disable */
// ---- Test subject
import * as farcasterProviderModule from "../Providers/farcaster";

import { RequestPayload } from "@gitcoin/passport-types";

// ----- Libs
import axios, { AxiosError } from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_ADDRESS = "0x685c99E8780e5a7f158617cC2E9acc0e45a66120";

const validFarcasterUserResponse = {
  data: {
    data: {
      address: MOCK_ADDRESS,
    },
  },
  status: 200,
};

const schema = {
  id: farcasterProviderModule.VERIFIED_ACCOUNT_SCHEMA,
};

beforeEach(() => {
  jest.clearAllMocks();
  
  mockedAxios.get.mockImplementation(async (url, config) => {
    return validFarcasterUserResponse;
  });
});

describe("verifyFarcasterAttestation", () => {
  const testAddress = "0xTestAddress";
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for a valid attestation", async () => {
    const mockResponse = {
      data: {
        data: {
          attestations: [
            {
              recipient: testAddress,
              revocationTime: 0,
              revoked: false,
              expirationTime: 0, // 10 seconds in the future
              schema,
            },
          ],
        },
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const result = await farcasterProviderModule.verifyFarcasterAttestation(testAddress);

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(farcasterProviderModule.BASE_EAS_SCAN_URL, {
      query: expect.any(String),
    });
  });

  it("should return false for an attestation that is expired", async () => {
    const mockResponse = {
      data: {
        data: {
          attestations: [
            {
              recipient: testAddress,
              revocationTime: 0,
              revoked: false,
              expirationTime: Date.now() / 1000 - 10000, // 10 seconds in the past
            },
          ],
        },
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const result = await farcasterProviderModule.verifyFarcasterAttestation(testAddress);
    expect(result).toBe(false);
  });
});

describe("Attempt verification", function () {
  it("should fail if unable to find ID", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      return {
        data: {
          id: undefined,
        },
      };
    });

    const farcaster = new farcasterProviderModule.FarcasterProvider();
    const farcasterPayload = await farcaster.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    expect(mockedAxios.post).toBeCalledTimes(1);

    expect(farcasterPayload).toMatchObject({
      valid: false,
      errors: [`We could not find a Farcaster-verified onchain attestation for your address: ${MOCK_ADDRESS}.`],
    });
  });

  it("handles valid verification attempt", async () => {
    jest.spyOn(farcasterProviderModule, "verifyFarcasterAttestation").mockResolvedValueOnce(true);
    mockedAxios.get.mockResolvedValue(validFarcasterUserResponse);
    const farcaster = new farcasterProviderModule.FarcasterProvider();
    const farcasterPayload = await farcaster.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    expect(farcasterPayload).toEqual(
      expect.objectContaining({ valid: true, record: { address: validFarcasterUserResponse.data.data.address } })
    );
  });
});
