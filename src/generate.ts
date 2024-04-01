interface BlockState {
  [property: string]: string | number | boolean;
}

function generateBlockStates(properties: string[], values: (string | number | boolean)[][]): BlockState[] {
  const blockStates: BlockState[] = [];

  // We want to generate every possible combination of block states
  // So we need to iterate through each property of the state object
  function generateCombination(index: number, currentState: BlockState) {
    // If we have iterated through all the properties
    if (index === properties.length) {
      // Push the current state to the block states array
      blockStates.push(currentState);
      // Return to the previous state
      return;
    }

    // Get the current property
    const property = properties[index];
    // Get the values of the current property
    const propertyValues = values[index];

    // Iterate through each value of the current property
    for (const value of propertyValues) {
      // Add the current property to the current state
      currentState[property] = value;
      // Generate the next combination
      generateCombination(index + 1, { ...currentState });
    }
  }

  generateCombination(0, {});

  return blockStates;
}

export { type BlockState, generateBlockStates }