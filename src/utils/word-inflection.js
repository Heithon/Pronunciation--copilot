/**
 * Word Inflection Handler for IPA Conversion
 * 
 * Handles inflected forms (plurals, past tense, gerunds) by:
 * 1. Detecting if a word is inflected
 * 2. Finding the base form (lemmatization)
 * 3. Transforming the base IPA to inflected IPA
 */

/**
 * Common irregular past tense forms that should NOT be lemmatized
 */
const IRREGULAR_PAST_TENSE = new Set([
  'went', 'came', 'saw', 'made', 'took', 'got', 'gave', 'found', 'thought',
  'told', 'left', 'kept', 'felt', 'brought', 'began', 'ran', 'sat', 'stood',
  'heard', 'met', 'read', 'lost', 'paid', 'sent', 'built', 'spent', 'caught',
  'taught', 'bought', 'fought', 'sold', 'wore', 'won', 'understood', 'said',
  'ate', 'wrote', 'drove', 'broke', 'spoke', 'chose', 'fell', 'knew', 'grew',
  'threw', 'drew', 'flew', 'sang', 'rang', 'swam', 'began', 'drank', 'sank'
]);

/**
 * Common irregular plural forms
 */
const IRREGULAR_PLURALS = new Set([
  'men', 'women', 'children', 'teeth', 'feet', 'geese', 'mice', 'lice',
  'people', 'oxen', 'analyses', 'bases', 'crises', 'diagnoses', 'hypotheses',
  'oases', 'parentheses', 'syntheses', 'theses', 'criteria', 'phenomena',
  'data', 'media', 'bacteria', 'alumni', 'cacti', 'foci', 'fungi', 'nuclei',
  'radii', 'stimuli', 'syllabi', 'axes', 'appendices', 'indices', 'matrices'
]);

/**
 * Detect if word ends with -ed and find base form
 */
function tryRemoveEdSuffix(word) {
  if (word.length < 4) return null;
  
  // Already irregular past tense
  if (IRREGULAR_PAST_TENSE.has(word)) {
    return null;
  }
  
  if (!word.endsWith('ed')) return null;
  
  const stem = word.slice(0, -2);
  
  // Rule 1: Double consonant (stopped -> stop)
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return {
      base: stem.slice(0, -1),
      type: 'ed-double',
      suffix: 'ed'
    };
  }
  
  // Rule 2: Changed y to i (tried -> try)
  if (stem.endsWith('i')) {
    return {
      base: stem.slice(0, -1) + 'y',
      type: 'ed-y-to-i',
      suffix: 'ed'
    };
  }
  
  // Rule 3: Simple -ed (walked -> walk)
  return {
    base: stem,
    type: 'ed-simple',
    suffix: 'ed'
  };
}

/**
 * Detect if word ends with -s/-es and find base form
 */
function tryRemoveSuffix(word) {
  if (word.length < 3) return null;
  
  // Already irregular plural
  if (IRREGULAR_PLURALS.has(word)) {
    return null;
  }
  
  // Rule 1: -ies -> -y (tries -> try)
  if (word.endsWith('ies') && word.length > 3) {
    return {
      base: word.slice(0, -3) + 'y',
      type: 's-ies',
      suffix: 's'
    };
  }
  
  // Rule 2: -es after sibilants (watches -> watch, boxes -> box)
  // Need to check the character BEFORE 'es', not after removing 'es'
  if (word.endsWith('es') && word.length > 2) {
    const charBeforeEs = word[word.length - 3];
    const twoCharsBeforeEs = word.slice(word.length - 4, word.length - 2);
    
    // Check if ends with sibilant + es
    // sh, ch, ss, x + es -> remove es
    if (twoCharsBeforeEs === 'sh' || twoCharsBeforeEs === 'ch' || 
        twoCharsBeforeEs === 'ss' || charBeforeEs === 'x' || charBeforeEs === 'z') {
      return {
        base: word.slice(0, -2),
        type: 's-es-sibilant',
        suffix: 's'
      };
    }
    
    // Special case: -ses where the 's' is part of the base word
    // e.g., "causes" -> "cause", "uses" -> "use", "raises" -> "raise"
    // These don't follow the sibilant rule but still end in -es
    // So we should try removing just 's' first, and if that doesn't work, try 'es'
  }
  
  // Rule 3: -oes -> -o (goes -> go, but not shoes)
  if (word.endsWith('oes') && word.length > 3) {
    return {
      base: word.slice(0, -2),
      type: 's-oes',
      suffix: 's'
    };
  }
  
  // Rule 4: -ves -> -f/-fe (lives -> life, knives -> knife)
  if (word.endsWith('ves') && word.length > 3) {
    const stem = word.slice(0, -3);
    // Try both -f and -fe
    return {
      base: stem + 'fe', // Will try 'f' as fallback in caller
      type: 's-ves',
      suffix: 's',
      alternativeBase: stem + 'f'
    };
  }
  
  // Rule 5: -ses -> -s (cases -> case)
  // BUT we need to distinguish from words that actually end in -se
  // This is tricky - "cases" -> "case", but we already checked sibilants above
  
  // Rule 6: Simple -s (walks -> walk, raises -> raise)
  // This should handle most cases including "raises", "causes", "uses"
  if (word.endsWith('s')) {
    return {
      base: word.slice(0, -1),
      type: 's-simple',
      suffix: 's'
    };
  }
  
  return null;
}

/**
 * Detect if word ends with -ing and find base form
 */
function tryRemoveIngSuffix(word) {
  if (word.length < 5 || !word.endsWith('ing')) return null;
  
  const stem = word.slice(0, -3);
  
  // Rule 1: Double consonant (running -> run)
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return {
      base: stem.slice(0, -1),
      type: 'ing-double',
      suffix: 'ing'
    };
  }
  
  // Rule 2: -e dropped (making -> make)
  // Try adding 'e' back
  return {
    base: stem + 'e',
    type: 'ing-e-dropped',
    suffix: 'ing',
    alternativeBase: stem
  };
}

/**
 * Detect if word ends with -ly and find base form (for adverbs)
 */
function tryRemoveLySuffix(word) {
  if (word.length < 4 || !word.endsWith('ly')) return null;
  
  const stem = word.slice(0, -2);
  
  // Rule 1: -ily -> -y (happily -> happy)
  if (stem.endsWith('i') && stem.length > 1) {
    return {
      base: stem.slice(0, -1) + 'y',
      type: 'ly-ily',
      suffix: 'ly'
    };
  }
  
  // Rule 2: -ally (dramatically -> dramatic)
  // But keep for simple -ly removal
  
  // Rule 3: -le -> -ly (possible -> possibly)
  // Try adding 'e' back
  if (stem.length > 0) {
    return {
      base: stem,
      type: 'ly-simple',
      suffix: 'ly',
      alternativeBase: stem + 'e' // For possible -> possibly
    };
  }
  
  return null;
}

/**
 * Detect if word ends with -er (comparative) and find base form
 */
function tryRemoveErSuffix(word) {
  if (word.length < 4 || !word.endsWith('er')) return null;
  
  const stem = word.slice(0, -2);
  
  // Rule 1: Double consonant (bigger -> big)
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return {
      base: stem.slice(0, -1),
      type: 'er-double',
      suffix: 'er'
    };
  }
  
  // Rule 2: Changed y to i (happier -> happy)
  if (stem.endsWith('i')) {
    return {
      base: stem.slice(0, -1) + 'y',
      type: 'er-y-to-i',
      suffix: 'er'
    };
  }
  
  // Rule 3: Simple -er (faster -> fast)
  return {
    base: stem,
    type: 'er-simple',
    suffix: 'er'
  };
}

/**
 * Detect if word ends with -est (superlative) and find base form
 */
function tryRemoveEstSuffix(word) {
  if (word.length < 5 || !word.endsWith('est')) return null;
  
  const stem = word.slice(0, -3);
  
  // Rule 1: Double consonant (biggest -> big)
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return {
      base: stem.slice(0, -1),
      type: 'est-double',
      suffix: 'est'
    };
  }
  
  // Rule 2: Changed y to i (happiest -> happy)
  if (stem.endsWith('i')) {
    return {
      base: stem.slice(0, -1) + 'y',
      type: 'est-y-to-i',
      suffix: 'est'
    };
  }
  
  // Rule 3: Simple -est (fastest -> fast)
  return {
    base: stem,
    type: 'est-simple',
    suffix: 'est'
  };
}

/**
 * Detect if word ends with -ity (noun) and find base form
 */
function tryRemoveItySuffix(word) {
  if (word.length < 5 || !word.endsWith('ity')) return null;
  
  const stem = word.slice(0, -3); // Remove 'ity'
  
  // Rule 1: -ability -> -able (readability -> readable)
  if (stem.endsWith('abil')) {
    return {
      base: stem.slice(0, -4) + 'able',
      type: 'ity-ability',
      suffix: 'ity'
    };
  }
  
  // Rule 2: -ibility -> -ible (possibility -> possible  
  if (stem.endsWith('ibil')) {
    return {
      base: stem.slice(0, -4) + 'ible',
      type: 'ity-ibility',
      suffix: 'ity'
    };
  }
  
  // Rule 3: -ality -> -al (reality -> real)
  if (stem.endsWith('al')) {
    return {
      base: stem.slice(0, -2),
      type: 'ity-ality',
      suffix: 'ity',
      alternativeBase: stem.slice(0, -2) + 'al'
    };
  }
  
  // Rule 4: Simple -ity
  return {
    base: stem + 'e',
    type: 'ity-simple',
    suffix: 'ity',
    alternativeBase: stem
  };
}

/**
 * Detect if word ends with -y (adjective) and find base form
 */
function tryRemoveYSuffix(word) {
  if (word.length < 3 || !word.endsWith('y')) return null;
  
  const stem = word.slice(0, -1);
  
  // Rule 1: Double consonant (sunny -> sun)
  if (stem.length >= 2 && 
      stem[stem.length - 1] === stem[stem.length - 2] &&
      isConsonant(stem[stem.length - 1])) {
    return {
      base: stem.slice(0, -1),
      type: 'y-double',
      suffix: 'y'
    };
  }
  
  // Rule 2: -e dropped (noisy -> noise)
  return {
    base: stem + 'e',
    type: 'y-e-dropped',
    suffix: 'y',
    alternativeBase: stem
  };
}


/**
 * Helper: Check if character is a consonant
 */
function isConsonant(char) {
  return char && !'aeiou'.includes(char.toLowerCase());
}

/**
 * Helper: Check if character is a vowel
 */
function isVowel(char) {
  return char && 'aeiou'.includes(char.toLowerCase());
}

/**
 * Transform IPA for -ed suffix
 * Rules:
 * - After /t/ or /d/: add /ɪd/ (wanted, needed)
 * - After voiceless: add /t/ (walked, stopped)
 * - After voiced: add /d/ (played, grabbed)
 */
function transformIPAForEd(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1); // Remove slashes
  
  // Get the last sound
  const lastSound = getLastSound(ipa);
  
  if (!lastSound) return null;
  
  let suffix = '';
  
  // Rule 1: After /t/ or /d/, add /ɪd/
  if (lastSound === 't' || lastSound === 'd') {
    suffix = 'ɪd';
  }
  // Rule 2: After voiceless consonants, add /t/
  else if (isVoicelessConsonant(lastSound)) {
    suffix = 't';
  }
  // Rule 3: After voiced sounds (vowels or voiced consonants), add /d/
  else {
    suffix = 'd';
  }
  
  return `/${ipa}${suffix}/`;
}

/**
 * Transform IPA for -s suffix
 * Rules:
 * - After /s/, /z/, /ʃ/, /ʒ/, /tʃ/, /dʒ/: add /ɪz/ (watches, boxes)
 * - After voiceless: add /s/ (cats, walks)
 * - After voiced: add /z/ (dogs, runs)
 */
function transformIPAForS(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  const lastSound = getLastSound(ipa);
  
  if (!lastSound) return null;
  
  let suffix = '';
  
  // Rule 1: After sibilants, add /ɪz/
  if (['s', 'z', 'ʃ', 'ʒ'].includes(lastSound) || 
      ipa.endsWith('tʃ') || ipa.endsWith('dʒ')) {
    suffix = 'ɪz';
  }
  // Rule 2: After voiceless, add /s/
  else if (isVoicelessConsonant(lastSound)) {
    suffix = 's';
  }
  // Rule 3: After voiced, add /z/
  else {
    suffix = 'z';
  }
  
  return `/${ipa}${suffix}/`;
}

/**
 * Transform IPA for -ing suffix
 * Simply add /ɪŋ/ to the base
 */
function transformIPAForIng(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}ɪŋ/`;
}

/**
 * Transform IPA for -ly suffix
 * Simply add /li/ to the base
 */
function transformIPAForLy(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}li/`;
}

/**
 * Transform IPA for -er suffix (comparative)
 * Add /ər/ or /r/ depending on the base ending
 */
function transformIPAForEr(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}ər/`;
}

/**
 * Transform IPA for -est suffix (superlative)
 * Add /ɪst/ or /əst/
 */
function transformIPAForEst(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}ɪst/`;
}

/**
 * Transform IPA for -ity suffix
 * Add /əti/ or /ɪti/
 */
function transformIPAForIty(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}əti/`;
}

/**
 * Transform IPA for -y suffix (adjective)
 * Add /i/
 */
function transformIPAForY(baseIPA, inflectionType) {
  if (!baseIPA || !baseIPA.startsWith('/') || !baseIPA.endsWith('/')) {
    return null;
  }
  
  const ipa = baseIPA.slice(1, -1);
  return `/${ipa}i/`;
}


/**
 * Get the last phoneme from IPA string
 */
function getLastSound(ipa) {
  // Remove stress marks and length marks
  const cleaned = ipa.replace(/[ˈˌː]/g, '');
  
  // Check for digraphs at the end
  const digraphs = ['tʃ', 'dʒ', 'ŋ', 'ʃ', 'ʒ', 'θ', 'ð'];
  for (const digraph of digraphs) {
    if (cleaned.endsWith(digraph)) {
      return digraph;
    }
  }
  
  // Return last character
  return cleaned[cleaned.length - 1] || null;
}

/**
 * Check if a sound is a voiceless consonant
 */
function isVoicelessConsonant(sound) {
  const voiceless = ['p', 't', 'k', 'f', 's', 'θ', 'ʃ', 'tʃ', 'h'];
  return voiceless.includes(sound);
}

/**
 * Check if a sound is a voiced consonant
 */
function isVoicedConsonant(sound) {
  const voiced = ['b', 'd', 'g', 'v', 'z', 'ð', 'ʒ', 'dʒ', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j'];
  return voiced.includes(sound);
}

/**
 * Main function: Try to get IPA for inflected form
 * @param {string} word - Inflected word
 * @param {Function} getBaseIPA - Function to get IPA for base form (async)
 * @returns {Promise<string|null>} IPA or null
 */
export async function getInflectedIPA(word, getBaseIPA) {
  if (!word || word.length < 3) return null;
  
  // Try -ity suffix first (before -ly to catch "quality" before "qualit" + "y")
  const ityResult = tryRemoveItySuffix(word);
  if (ityResult) {
    let baseIPA = await getBaseIPA(ityResult.base);
    if (baseIPA) {
      const result = transformIPAForIty(baseIPA, ityResult.type);
      if (result) return result;
    }
    if (ityResult.alternativeBase) {
      baseIPA = await getBaseIPA(ityResult.alternativeBase);
      if (baseIPA) {
        const result = transformIPAForIty(baseIPA, ityResult.type);
        if (result) return result;
      }
    }
  }
  
  // Try -ly suffix
  const lyResult = tryRemoveLySuffix(word);
  if (lyResult) {
    let baseIPA = await getBaseIPA(lyResult.base);
    if (baseIPA) {
      const result = transformIPAForLy(baseIPA, lyResult.type);
      if (result) return result;
    }
    if (lyResult.alternativeBase) {
      baseIPA = await getBaseIPA(lyResult.alternativeBase);
      if (baseIPA) {
        const result = transformIPAForLy(baseIPA, lyResult.type);
        if (result) return result;
      }
    }
  }
  
  // Try -est suffix (before -er to catch "fastest" before "fast" + "er")
  const estResult = tryRemoveEstSuffix(word);
  if (estResult) {
    const baseIPA = await getBaseIPA(estResult.base);
    if (baseIPA) {
      const result = transformIPAForEst(baseIPA, estResult.type);
      if (result) return result;
    }
  }
  
  // Try -er suffix
  const erResult = tryRemoveErSuffix(word);
  if (erResult) {
    const baseIPA = await getBaseIPA(erResult.base);
    if (baseIPA) {
      const result = transformIPAForEr(baseIPA, erResult.type);
      if (result) return result;
    }
  }
  
  // Try -ing suffix
  const ingResult = tryRemoveIngSuffix(word);
  if (ingResult) {
    let baseIPA = await getBaseIPA(ingResult.base);
    if (baseIPA) {
      const result = transformIPAForIng(baseIPA, ingResult.type);
      if (result) return result;
    }
    if (ingResult.alternativeBase) {
      baseIPA = await getBaseIPA(ingResult.alternativeBase);
      if (baseIPA) {
        const result = transformIPAForIng(baseIPA, ingResult.type);
        if (result) return result;
      }
    }
  }
  
  // Try -ed suffix
  const edResult = tryRemoveEdSuffix(word);
  if (edResult) {
    const baseIPA = await getBaseIPA(edResult.base);
    if (baseIPA) {
      const result = transformIPAForEd(baseIPA, edResult.type);
      if (result) return result;
    }
  }
  
  // Try -y suffix (adjective, after -ly and -ity)
  const yResult = tryRemoveYSuffix(word);
  if (yResult) {
    let baseIPA = await getBaseIPA(yResult.base);
    if (baseIPA) {
      const result = transformIPAForY(baseIPA, yResult.type);
      if (result) return result;
    }
    if (yResult.alternativeBase) {
      baseIPA = await getBaseIPA(yResult.alternativeBase);
      if (baseIPA) {
        const result = transformIPAForY(baseIPA, yResult.type);
        if (result) return result;
      }
    }
  }
  
  // Try -s suffix (last, as it's most common and can conflict)
  const sResult = tryRemoveSuffix(word);
  if (sResult) {
    let baseIPA = await getBaseIPA(sResult.base);
    if (baseIPA) {
      const result = transformIPAForS(baseIPA, sResult.type);
      if (result) return result;
    }
    if (sResult.alternativeBase) {
      baseIPA = await getBaseIPA(sResult.alternativeBase);
      if (baseIPA) {
        const result = transformIPAForS(baseIPA, sResult.type);
        if (result) return result;
      }
    }
  }
  
  return null;
}

/**
 * Export individual functions for testing
 */
export {
  tryRemoveEdSuffix,
  tryRemoveSuffix,
  tryRemoveIngSuffix,
  tryRemoveLySuffix,
  tryRemoveErSuffix,
  tryRemoveEstSuffix,
  tryRemoveItySuffix,
  tryRemoveYSuffix,
  transformIPAForEd,
  transformIPAForS,
  transformIPAForIng,
  transformIPAForLy,
  transformIPAForEr,
  transformIPAForEst,
  transformIPAForIty,
  transformIPAForY
};
