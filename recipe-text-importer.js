/**
 * Recipe Text Importer
 *
 * This extension to the Recipe Cost Calculator allows importing recipes from plain text,
 * extracting ingredients and their quantities automatically, and calculating yield.
 */

class RecipeTextImporter {
  constructor(calculator) {
    this.calculator = calculator;
    this.ingredientsList = new Set();
    this.commonUnits = {
      // Volume measurements
      cup: 240,
      cups: 240,
      c: 240,
      tablespoon: 15,
      tablespoons: 15,
      tbsp: 15,
      tbsps: 15,
      tb: 15,
      tbs: 15,
      teaspoon: 5,
      teaspoons: 5,
      tsp: 5,
      tsps: 5,
      "fluid ounce": 30,
      "fluid ounces": 30,
      "fl oz": 30,
      pint: 473,
      pints: 473,
      pt: 473,
      quart: 946,
      quarts: 946,
      qt: 946,
      gallon: 3785,
      gallons: 3785,
      gal: 3785,
      milliliter: 1,
      milliliters: 1,
      ml: 1,
      liter: 1000,
      liters: 1000,
      l: 1000,

      // Weight measurements
      gram: 1,
      grams: 1,
      g: 1,
      kilogram: 1000,
      kilograms: 1000,
      kg: 1000,
      ounce: 28.35,
      ounces: 28.35,
      oz: 28.35,
      pound: 453.59,
      pounds: 453.59,
      lb: 453.59,
      lbs: 453.59,

      // Count measurements
      each: 1,
      whole: 1,
      piece: 1,
      pieces: 1,
      slice: 1,
      slices: 1,
      clove: 6, // Average garlic clove weight
      cloves: 6,
    };

    // Ingredient replacement map (e.g., "minced garlic" -> "garlic")
    this.ingredientReplacements = {
      // Structure: 'text in recipe': 'ingredient name in database'
    };

    // Standard item weights for count-based ingredients
    this.standardWeights = {
      egg: 50,
      eggs: 50,
      "large egg": 50,
      "large eggs": 50,
      "medium egg": 44,
      "medium eggs": 44,
      "small egg": 38,
      "small eggs": 38,
      onion: 150,
      onions: 150,
      "large onion": 200,
      "large onions": 200,
      "medium onion": 150,
      "medium onions": 150,
      "small onion": 100,
      "small onions": 100,
      "clove garlic": 6,
      "cloves garlic": 6,
      "garlic clove": 6,
      "garlic cloves": 6,
      lemon: 85,
      lemons: 85,
      lime: 65,
      limes: 65,
    };

    // Cooking loss/gain factors by cooking method
    this.cookingFactors = {
      boil: 1.05, // Pasta and rice absorb water
      steam: 1.02,
      fry: 0.85, // Water loss during frying
      bake: 0.9, // Water loss during baking
      roast: 0.85,
      grill: 0.8,
      braise: 0.95,
      simmer: 0.93,
      reduce: 0.7, // Significant reduction
    };
  }

  // Update ingredient list from calculator
  updateIngredientsList() {
    this.ingredientsList = new Set(this.calculator.getIngredientNames());
    return this.ingredientsList;
  }

  // Add ingredient replacements
  addIngredientReplacement(textInRecipe, ingredientInDatabase) {
    this.ingredientReplacements[textInRecipe.toLowerCase()] =
      ingredientInDatabase;
  }

  // Parse quantity from a string
  parseQuantity(quantityStr) {
    // Handle fractions
    if (quantityStr.includes("/")) {
      const parts = quantityStr.split(" ");
      let sum = 0;

      for (const part of parts) {
        if (part.includes("/")) {
          const [numerator, denominator] = part.split("/");
          sum += parseFloat(numerator) / parseFloat(denominator);
        } else if (!isNaN(part)) {
          sum += parseFloat(part);
        }
      }

      return sum;
    }

    return parseFloat(quantityStr);
  }

  // Convert a quantity from a given unit to grams
  convertToGrams(quantity, unit, ingredient) {
    unit = unit.toLowerCase().trim();
    ingredient = ingredient.toLowerCase().trim();

    // Check if it's a count-based ingredient with standard weight
    const itemKey =
      unit === "each" || unit === "whole" || unit === ""
        ? ingredient
        : `${unit} ${ingredient}`;

    if (this.standardWeights[itemKey]) {
      return quantity * this.standardWeights[itemKey];
    }

    // Check if it's a common unit
    if (this.commonUnits[unit]) {
      return quantity * this.commonUnits[unit];
    }

    // Default to the quantity as-is if we can't convert
    return quantity;
  }

  // Find matching ingredient in database
  findMatchingIngredient(ingredientText) {
    // Check direct match
    ingredientText = ingredientText.toLowerCase().trim();

    // Check for ingredient replacements
    if (this.ingredientReplacements[ingredientText]) {
      return this.ingredientReplacements[ingredientText];
    }

    // Check if the ingredient text contains a known ingredient
    for (const knownIngredient of this.ingredientsList) {
      const lowerKnown = knownIngredient.toLowerCase();

      // Direct match
      if (ingredientText === lowerKnown) {
        return knownIngredient;
      }

      // Contains match - ensure it's a word boundary match
      const regex = new RegExp(`\\b${lowerKnown}\\b`, "i");
      if (regex.test(ingredientText)) {
        return knownIngredient;
      }
    }

    // No match found
    return null;
  }

  // Extract ingredients from a line of text
  extractIngredientFromLine(line) {
    // Common patterns in recipe lines
    const patterns = [
      // 2 cups flour
      /^([\d./\s]+)\s+([\w\s]+)\s+([\w\s]+)$/,

      // 2 tablespoons of olive oil
      /^([\d./\s]+)\s+([\w\s]+)\s+of\s+([\w\s]+)$/,

      // flour, 2 cups
      /^([\w\s]+),\s+([\d./\s]+)\s+([\w\s]+)$/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Different arrangements based on pattern
        const isReversed = pattern.toString().includes("^([\\w\\s]+),");

        const quantity = this.parseQuantity(isReversed ? match[2] : match[1]);
        const unit = (isReversed ? match[3] : match[2]).trim();
        const ingredientText = (isReversed ? match[1] : match[3]).trim();

        const matchedIngredient = this.findMatchingIngredient(ingredientText);
        if (!matchedIngredient) {
          return {
            matched: false,
            originalText: line,
            ingredient: ingredientText,
            error: `Ingredient not found in database: ${ingredientText}`,
          };
        }

        const grams = this.convertToGrams(quantity, unit, ingredientText);

        return {
          matched: true,
          originalText: line,
          ingredient: matchedIngredient,
          quantity,
          unit,
          grams,
          notes: `Converted from ${quantity} ${unit}`,
        };
      }
    }

    // If no pattern matched, check if it's just an ingredient without quantity
    const potentialIngredient = line.trim();
    const matchedIngredient = this.findMatchingIngredient(potentialIngredient);

    if (matchedIngredient) {
      return {
        matched: true,
        originalText: line,
        ingredient: matchedIngredient,
        quantity: 1,
        unit: "each",
        grams: this.convertToGrams(1, "each", potentialIngredient),
        notes: `Assumed 1 each`,
      };
    }

    // No valid ingredient found
    return {
      matched: false,
      originalText: line,
      error: `Could not parse ingredient line: ${line}`,
    };
  }

  // Detect cooking method from recipe text
  detectCookingMethod(recipeText) {
    const text = recipeText.toLowerCase();
    for (const method in this.cookingFactors) {
      if (text.includes(method)) {
        return method;
      }
    }
    return null;
  }

  // Automatically calculate recipe yield based on ingredients
  calculateYield(ingredients, recipeText) {
    // Sum up the weight of all ingredients
    let totalGrams = ingredients.reduce((sum, ing) => sum + ing.quantity, 0);

    // Apply cooking factor if method detected
    const cookingMethod = this.detectCookingMethod(recipeText);
    if (cookingMethod && this.cookingFactors[cookingMethod]) {
      totalGrams = Math.round(totalGrams * this.cookingFactors[cookingMethod]);
    }

    return Math.round(totalGrams);
  }

  // Suggest a portion size based on recipe type
  suggestPortionSize(recipeText, totalYield) {
    const text = recipeText.toLowerCase();
    let portionSize;

    // Detect recipe type
    if (text.includes("soup") || text.includes("stew")) {
      portionSize = 250; // Soups/stews typically ~250g per serving
    } else if (text.includes("salad")) {
      portionSize = 150; // Salads typically ~150g per serving
    } else if (
      text.includes("cake") ||
      text.includes("dessert") ||
      text.includes("cookie")
    ) {
      portionSize = 100; // Desserts typically ~100g per serving
    } else if (text.includes("bread") || text.includes("muffin")) {
      portionSize = 60; // Breads typically ~60g per serving
    } else if (text.includes("sauce") || text.includes("dressing")) {
      portionSize = 30; // Sauces typically ~30g per serving
    } else {
      // Default: estimate 4-6 servings for the recipe
      portionSize = Math.round(totalYield / 5);
    }

    return portionSize;
  }

  // Process a full recipe text
  processRecipeText(
    recipeText,
    recipeName,
    userProvidedYield = null,
    userProvidedPortionSize = null
  ) {
    this.updateIngredientsList();

    // Split into lines and process each line
    const lines = recipeText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let ingredients = [];
    let errors = [];

    for (const line of lines) {
      // Skip lines that look like instructions (usually longer and have verbs)
      if (
        line.length > 60 ||
        /\b(stir|mix|cook|bake|heat|add|combine|fold|whisk|beat|prepare)\b/i.test(
          line
        )
      ) {
        continue;
      }

      const result = this.extractIngredientFromLine(line);

      if (result.matched) {
        ingredients.push({
          ingredient: result.ingredient,
          quantity: result.grams,
          notes: `${result.originalText} (${result.quantity} ${result.unit})`,
        });
      } else {
        errors.push(result);
      }
    }

    // Calculate recipe yield automatically if not provided
    const calculatedYield = this.calculateYield(ingredients, recipeText);
    const yieldAmount = userProvidedYield || calculatedYield;

    // Suggest a default portion size
    const suggestedPortionSize = this.suggestPortionSize(
      recipeText,
      yieldAmount
    );
    const portionSize = userProvidedPortionSize || suggestedPortionSize;

    // Create the recipe if we have ingredients and no fatal errors
    if (ingredients.length > 0) {
      try {
        const recipe = this.calculator.createRecipe(
          recipeName,
          yieldAmount,
          ingredients,
          portionSize
        );

        return {
          success: true,
          recipe,
          errors: errors.length > 0 ? errors : null,
          ingredients,
          calculatedYield,
          suggestedPortionSize,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
          details: errors,
        };
      }
    } else {
      return {
        success: false,
        error: "No valid ingredients could be extracted from the recipe text.",
        details: errors,
      };
    }
  }

  // Get CSV for the processed recipe
  getProcessedRecipeCSV(recipeName) {
    return this.calculator.generateRecipeCSV(recipeName);
  }
}

// Add to the existing calculator functionality
function extendRecipeCalculator() {
  // Get reference to the calculator instance
  const calculator = window.calculator;

  // Create the text importer
  const textImporter = new RecipeTextImporter(calculator);

  // Add UI for text import
  const container = document.querySelector(".container");
  const firstColumn = container.querySelector("div:first-child");

  const textImportCard = document.createElement("div");
  textImportCard.className = "card";
  textImportCard.innerHTML = `
      <h2>Import Recipe from Text</h2>
      <textarea id="recipeText" placeholder="Paste your recipe text here..." rows="10"></textarea>
      <div class="recipe-form">
        <label for="textRecipeName">Recipe Name:</label>
        <input type="text" id="textRecipeName" placeholder="Enter recipe name">
        
        <label for="textRecipeYield">Recipe Yield (g):</label>
        <div class="input-group">
          <input type="number" id="textRecipeYield" placeholder="Will be calculated automatically">
          <span id="calculatedYield" class="input-note"></span>
        </div>
        
        <label for="textRecipePortionSize">Portion Size (g):</label>
        <div class="input-group">
          <input type="number" id="textRecipePortionSize" placeholder="Enter portion size (optional)">
          <span id="suggestedPortionSize" class="input-note"></span>
        </div>
      </div>
      <button id="importTextRecipeBtn">Process Recipe</button>
      <div id="importErrors" style="margin-top: 10px; color: red;"></div>
    `;

  // Add some styling for the new elements
  const style = document.createElement("style");
  style.textContent = `
      .input-group {
        display: flex;
        align-items: center;
      }
      .input-note {
        margin-left: 8px;
        font-size: 0.85em;
        color: #666;
      }
      #calculatedYield, #suggestedPortionSize {
        font-style: italic;
      }
    `;
  document.head.appendChild(style);

  firstColumn.appendChild(textImportCard);

  // Add event listener for recipe text input to provide real-time yield calculation
  document.getElementById("recipeText").addEventListener(
    "input",
    debounce(() => {
      const recipeText = document.getElementById("recipeText").value;
      if (recipeText.length > 50) {
        // Only process if enough text is entered
        // Parse the text to extract ingredients
        textImporter.updateIngredientsList();
        const lines = recipeText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        let ingredients = [];
        for (const line of lines) {
          // Skip lines that look like instructions
          if (
            line.length > 60 ||
            /\b(stir|mix|cook|bake|heat|add|combine|fold|whisk|beat|prepare)\b/i.test(
              line
            )
          ) {
            continue;
          }

          const result = textImporter.extractIngredientFromLine(line);
          if (result.matched) {
            ingredients.push({
              ingredient: result.ingredient,
              quantity: result.grams,
              notes: `${result.originalText} (${result.quantity} ${result.unit})`,
            });
          }
        }

        if (ingredients.length > 0) {
          const calculatedYield = textImporter.calculateYield(
            ingredients,
            recipeText
          );
          const suggestedPortionSize = textImporter.suggestPortionSize(
            recipeText,
            calculatedYield
          );

          document.getElementById(
            "calculatedYield"
          ).textContent = `Calculated: ~${calculatedYield}g`;
          document.getElementById(
            "suggestedPortionSize"
          ).textContent = `Suggested: ~${suggestedPortionSize}g`;
        }
      }
    }, 800)
  ); // Debounce to avoid too many calculations

  // Add event listener for import button
  document
    .getElementById("importTextRecipeBtn")
    .addEventListener("click", () => {
      const recipeText = document.getElementById("recipeText").value;
      const recipeName = document.getElementById("textRecipeName").value;
      const recipeYield = document.getElementById("textRecipeYield").value
        ? parseFloat(document.getElementById("textRecipeYield").value)
        : null;
      const portionSize = document.getElementById("textRecipePortionSize").value
        ? parseFloat(document.getElementById("textRecipePortionSize").value)
        : null;

      if (!recipeText || !recipeName) {
        alert("Please provide recipe text and name.");
        return;
      }

      const result = textImporter.processRecipeText(
        recipeText,
        recipeName,
        recipeYield,
        portionSize
      );

      if (result.success) {
        // Load recipe data into the output textarea
        document.getElementById("recipeOutput").value =
          textImporter.getProcessedRecipeCSV(recipeName);

        // Show errors if any
        const errorsContainer = document.getElementById("importErrors");
        if (result.errors && result.errors.length > 0) {
          errorsContainer.innerHTML =
            "<h3>Warnings:</h3><ul>" +
            result.errors.map((err) => `<li>${err.error}</li>`).join("") +
            "</ul><p>The recipe was created with the ingredients that could be matched.</p>";
        } else {
          errorsContainer.innerHTML = "";
        }

        // Update the yield input with the calculated value
        document.getElementById("textRecipeYield").value = result.recipe.yield;
        document.getElementById(
          "calculatedYield"
        ).textContent = `Calculated: ~${result.calculatedYield}g`;

        // Update the portion size with the suggested value if not provided by user
        if (!portionSize) {
          document.getElementById("textRecipePortionSize").value =
            result.recipe.portionSize;
          document.getElementById(
            "suggestedPortionSize"
          ).textContent = `Suggested: ~${result.suggestedPortionSize}g`;
        }

        // Populate the recipe form
        document.getElementById("recipeName").value = recipeName;
        document.getElementById("recipeYield").value = result.recipe.yield;
        document.getElementById("portionSize").value =
          result.recipe.portionSize;

        // Clear existing ingredient rows
        document.getElementById("ingredientsList").innerHTML = "";

        // Add rows for each ingredient
        result.ingredients.forEach((ing) => {
          // Add a new row
          document.getElementById("addIngredientBtn").click();

          // Get the last added row
          const rows = document.querySelectorAll(".ingredient-row");
          const lastRow = rows[rows.length - 1];

          // Set values in the row
          const select = lastRow.querySelector(".ingredient-select");
          const quantityInput = lastRow.querySelector(".ingredient-quantity");
          const notesInput = lastRow.querySelector(".ingredient-notes");

          // Find and select the right option
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === ing.ingredient) {
              select.selectedIndex = i;
              break;
            }
          }

          quantityInput.value = ing.quantity;
          notesInput.value = ing.notes || "";
        });

        alert(
          "Recipe processed successfully! Some ingredients might need adjustment."
        );
      } else {
        // Show error
        document.getElementById("importErrors").innerHTML = `
          <h3>Error:</h3>
          <p>${result.error}</p>
          <h4>Details:</h4>
          <ul>
            ${result.details.map((err) => `<li>${err.error}</li>`).join("")}
          </ul>
          <p>Please check that all ingredients exist in your ingredient database.</p>
        `;
      }
    });

  // Helper function for debouncing input events
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Return the importer for additional configuration
  return textImporter;
}

// Call when document is ready
document.addEventListener("DOMContentLoaded", function () {
  window.recipeImporter = extendRecipeCalculator();

  // Configure with any default replacements
  window.recipeImporter.addIngredientReplacement("minced garlic", "Garlic");
  window.recipeImporter.addIngredientReplacement("olive oil", "Olive Oil");
  window.recipeImporter.addIngredientReplacement("all-purpose flour", "Flour");
  window.recipeImporter.addIngredientReplacement("granulated sugar", "Sugar");
  window.recipeImporter.addIngredientReplacement("brown sugar", "Brown Sugar");
  window.recipeImporter.addIngredientReplacement("unsalted butter", "Butter");
  window.recipeImporter.addIngredientReplacement("kosher salt", "Salt");
  window.recipeImporter.addIngredientReplacement("sea salt", "Salt");
  window.recipeImporter.addIngredientReplacement(
    "black pepper",
    "Black Pepper"
  );
  // Add more replacements as needed
});
