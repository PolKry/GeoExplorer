import { joinPartyByCode } from "../../api/party-api.js";
import { PAGES } from "../../constants/resources.js";
import { getPartyCode, setPartyCode } from "../../utils/storage.js";
import { showMessage, showToast } from "../../utils/toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const inputs = [...document.querySelectorAll(".code-input")];
    if (!inputs.length) return;

    hydrateCodeInputs(inputs);
    bindCodeInputs(inputs);
    bindJoinForm(inputs);
});

function hydrateCodeInputs(inputs) {
    inputs[0].focus();
    inputs[0].setSelectionRange(1, 1);

    const partyCode = getPartyCode();
    if (!partyCode) return;

    inputs.forEach((input, index) => {
        input.value = partyCode.charAt(index);
    });
    inputs.at(-1).focus();
    inputs.at(-1).setSelectionRange(1, 1);
}

function bindCodeInputs(inputs) {
    inputs.forEach((input, index) => {
        input.addEventListener("input", () => focusNextInput(inputs, input, index));
        input.addEventListener("keydown", event => focusPreviousInput(inputs, input, index, event));
        input.addEventListener("paste", event => pasteCode(inputs, event));
    });
}

function focusNextInput(inputs, input, index) {
    const nextInput = inputs[index + 1];
    if (input.value.length === input.maxLength && nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(0, 0);
    }
}

function focusPreviousInput(inputs, input, index, event) {
    if (event.key !== "Backspace" || input.value !== "") return;

    const previousInput = inputs[index - 1];
    if (previousInput) {
        previousInput.focus();
        previousInput.setSelectionRange(previousInput.value.length, previousInput.value.length);
    }
}

function pasteCode(inputs, event) {
    event.preventDefault();

    const pasteData = (event.clipboardData || window.clipboardData)
        .getData("text")
        .slice(0, inputs.length);

    inputs.forEach((input, index) => {
        input.value = pasteData.charAt(index);
    });
    inputs.at(-1).focus();
}

function bindJoinForm(inputs) {
    document.getElementById("join-party-form").addEventListener("submit", async event => {
        event.preventDefault();

        const code = inputs.map(input => input.value).join("").trim().toUpperCase();
        if (code.length < inputs.length) {
            showToast("Please enter the full party code", "error");
            return;
        }

        try {
            const party = await joinPartyByCode(code);
            
            setPartyCode(party.code);
            window.location.href = PAGES.waitingRoom;
        } catch (err) {
            console.error("Error joining party:", err.message);
            showMessage("Failed to join party. Please check your code.", "error");
        }
    });
}
