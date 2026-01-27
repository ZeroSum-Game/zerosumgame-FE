/**
 * Korean Character Utilities
 */

const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

/**
 * Extracts the Chosung (initial consonant) from a Korean string.
 * Non-Korean characters are returned as is.
 * @param text Input string
 * @returns String of Chosung characters
 */
export const getChosung = (text: string): string => {
    return text.split('').map(char => {
        const code = char.charCodeAt(0) - 0xAC00;
        if (code > -1 && code < 11172) {
            // Korean character
            const chosungIndex = Math.floor(code / 588);
            return CHOSUNG[chosungIndex];
        }
        return char; // Return as-is for non-Korean
    }).join('');
};
