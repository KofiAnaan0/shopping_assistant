import parsePhoneNumberFromString from "libphonenumber-js";
import { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CustomPhoneInput: React.FC<PhoneInputProps> = ({ value, onChange }) => {
  const [phoneError, setPhoneError] = useState("");

  const validatePhone = (phone: string) => {
    const phoneNumber = parsePhoneNumberFromString(phone, "UG");

    if (phoneNumber && phoneNumber.isValid()) {
      setPhoneError("");
      return true;
    } else {
      setPhoneError("Invalid Phone number");
    }
  };

  const handleInputChange = (phone: string) => {
    onChange(phone), validatePhone(phone);
  };
  return (
    <div className="w-full max-w-sm mx-auto">
      <PhoneInput
        country="ug"
        value={value}
        onChange={handleInputChange}
        inputStyle={{
          width: "100%",
          height: "40px",
          borderRadius: "8px",
          border: phoneError ? "red" : "",
        }}
        dropdownStyle={{ borderRadius: "8px" }}
        containerStyle={{ margin: "0 auto" }}
      />
      {phoneError && <p className="text-red-500 text-sm mt-3">{phoneError}</p>}
    </div>
  );
};

export default CustomPhoneInput;
