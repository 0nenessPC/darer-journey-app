import { useState } from 'react';
import { useCloudVoice } from './useCloudVoice';

/**
 * Shared D.A.R.E.R. flow state — form fields for Decide, Allow, Rise, Engage phases.
 * Used by both BossBattle and TutorialBattle to avoid duplicating ~25 useState calls.
 * Each screen handles its own obState persistence (mixed with screen-specific fields).
 */
export function useDARERFlow({ obState = {} } = {}) {
  // Decide fields
  const [decideCustom, setDecideCustom] = useState('');
  const [decideSelectedVals, setDecideSelectedVals] = useState([]);

  // Allow fields
  const [allowFearful, setAllowFearful] = useState(obState.allowFearful || '');
  const [allowLikelihood, setAllowLikelihood] = useState(obState.allowLikelihood ?? null);
  const [allowSeverity, setAllowSeverity] = useState(obState.allowSeverity ?? null);
  const [allowCanHandle, setAllowCanHandle] = useState(obState.allowCanHandle || '');
  const [allowFearShowing, setAllowFearShowing] = useState(obState.allowFearShowing || '');
  const [allowPhysicalSensations, setAllowPhysicalSensations] = useState(
    obState.allowPhysicalSensations || [],
  );
  const [allowCustomSensation, setAllowCustomSensation] = useState(
    obState.allowCustomSensation || '',
  );

  // Rise fields
  const [riseSubStep, setRiseSubStep] = useState(obState.riseSubStep ?? 0);
  const [exposureWhen, setExposureWhen] = useState(obState.exposureWhen || '');
  const [exposureWhere, setExposureWhere] = useState(obState.exposureWhere || '');
  const [exposureArmory, setExposureArmory] = useState(obState.exposureArmory || '');
  const [exposureScheduledTime, setExposureScheduledTime] = useState(
    obState.exposureScheduledTime || '',
  );
  const [selectedArmoryTool, setSelectedArmoryTool] = useState(null);

  // Engage fields
  const [engageSubStep, setEngageSubStep] = useState(0);
  const [engageFreeText, setEngageFreeText] = useState('');
  const [fearedHappened, setFearedHappened] = useState('');
  const [fearedSeverity, setFearedSeverity] = useState('');
  const [madeItThrough, setMadeItThrough] = useState('');

  // Repeat
  const [repeatOptions, setRepeatOptions] = useState([]);

  // Voice
  const voice = useCloudVoice({ useCloud: false });

  // Reset all fields to defaults
  const resetFlow = () => {
    setDecideCustom('');
    setDecideSelectedVals([]);
    setAllowFearful('');
    setAllowLikelihood(null);
    setAllowSeverity(null);
    setAllowCanHandle('');
    setAllowFearShowing('');
    setAllowPhysicalSensations([]);
    setAllowCustomSensation('');
    setRiseSubStep(0);
    setExposureWhen('');
    setExposureWhere('');
    setExposureArmory('');
    setExposureScheduledTime('');
    setSelectedArmoryTool(null);
    setEngageSubStep(0);
    setEngageFreeText('');
    setFearedHappened('');
    setFearedSeverity('');
    setMadeItThrough('');
    setRepeatOptions([]);
  };

  return {
    // Decide
    decideCustom,
    setDecideCustom,
    decideSelectedVals,
    setDecideSelectedVals,
    // Allow
    allowFearful,
    setAllowFearful,
    allowLikelihood,
    setAllowLikelihood,
    allowSeverity,
    setAllowSeverity,
    allowCanHandle,
    setAllowCanHandle,
    allowFearShowing,
    setAllowFearShowing,
    allowPhysicalSensations,
    setAllowPhysicalSensations,
    allowCustomSensation,
    setAllowCustomSensation,
    // Rise
    riseSubStep,
    setRiseSubStep,
    exposureWhen,
    setExposureWhen,
    exposureWhere,
    setExposureWhere,
    exposureArmory,
    setExposureArmory,
    exposureScheduledTime,
    setExposureScheduledTime,
    selectedArmoryTool,
    setSelectedArmoryTool,
    // Engage
    engageSubStep,
    setEngageSubStep,
    engageFreeText,
    setEngageFreeText,
    fearedHappened,
    setFearedHappened,
    fearedSeverity,
    setFearedSeverity,
    madeItThrough,
    setMadeItThrough,
    // Repeat
    repeatOptions,
    setRepeatOptions,
    // Voice
    voice,
    // Helpers
    resetFlow,
  };
}
