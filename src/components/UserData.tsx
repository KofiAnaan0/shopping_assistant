"use client";

import { useState } from "react";
import CustomPhoneInput from "./PhoneInput";
import { useRouter } from "next/navigation";

export default function UserData() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading state

  const router = useRouter();

  const validateName = (name: string) => {
    const isValid = name.trim().split(" ").length >= 2;
    setNameError(
      isValid ? "" : "Please enter your full name (e.g., First Last)."
    );
    return isValid;
  };

  const isFormValid = () => {
    return name && phone && !nameError;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputName = e.target.value;
    setName(inputName);
    validateName(inputName);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); // Start loading

    try {
      const res = await fetch("api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        console.log("Error in data");
      }
    } catch (error) {
      console.error("Error submitting data", error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <div className="h-screen grid place-items-center">
      <div className="shadow-lg border-t-4 border-green-400 p-5 bg-white rounded-lg w-full max-w-sm">
        <h1 className="font-bold text-lg my-4 text-center">Enter Details</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name Field */}
          <div>
            <h1 className="text-sm font-bold mb-2">Name</h1>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g Kofi Anaan"
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "8px",
                border: nameError ? "1px solid red" : "1px solid #ccc",
                padding: "0 10px",
                fontSize: "16px",
                outline: "none",
              }}
            />
            {nameError && (
              <p className="text-red-500 text-sm mt-2">{nameError}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <h1 className="text-sm font-bold mb-2">Phone</h1>
            <CustomPhoneInput value={phone} onChange={setPhone} />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`py-3 rounded-md transition duration-200 flex items-center justify-center ${
              isFormValid()
                ? "bg-green-700 text-white hover:bg-green-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!isFormValid() || isLoading} // Disable button during loading
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            ) : (
              "Get Started"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
