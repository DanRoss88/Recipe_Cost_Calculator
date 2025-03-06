/**
 * Recipe Cost Calculator
 * 
 * This program allows you to define ingredients once and reference them
 * when creating recipe cost sheets. It handles unit conversions and
 * outputs formatted CSV data.
 */

// Define ingredient structure
interface Ingredient {
    name: string;
    unit: string;
    pricePerKg: number;
    pricePerG: number;
    supplier?: string;
    notes?: string;
  }
  
  // Define recipe ingredient structure
  interface RecipeIngredient {
    ingredient: string;  // Name of ingredient to reference
    quantity: number;    // In grams
    notes?: string;
  }
  
  // Define recipe structure
  interface Recipe {
    name: string;
    yield: number;       // In grams
    portionSize?: number; // In grams
    date: string;
    ingredients: RecipeIngredient[];
  }
  
  // Main calculator class
  class RecipeCostCalculator {
    private ingredients: Map<string, Ingredient>;
    private recipes: Map<string, Recipe>;
    
    constructor() {
      this.ingredients = new Map();
      this.recipes = new Map();
    }
  
    // Add an ingredient to the database
    addIngredient(
      name: string, 
      unit: string, 
      price: number, 
      supplier?: string, 
      notes?: string
    ): void {
      // Calculate price per gram based on unit
      let pricePerG: number;
      
      if (unit.toLowerCase() === 'kg') {
        pricePerG = price / 1000;
      } else if (unit.toLowerCase() === 'g') {
        pricePerG = price;
      } else if (unit.toLowerCase() === 'l') {
        // Assuming density of 1g/ml for simplicity - can be adjusted per ingredient
        pricePerG = price / 1000;
      } else if (unit.toLowerCase() === 'each') {
        // For "each" units, price is per individual item
        // We'll need the weight in notes to calculate per gram
        const weightMatch = notes?.match(/average.*?(\d+)g/i);
        const weight = weightMatch ? parseInt(weightMatch[1]) : 100; // Default to 100g if no weight specified
        pricePerG = price / weight;
      } else {
        pricePerG = price; // Default case
      }
      
      this.ingredients.set(name, {
        name,
        unit,
        pricePerKg: unit.toLowerCase() === 'kg' ? price : price * 1000,
        pricePerG,
        supplier,
        notes
      });
    }
  
    // Bulk add ingredients from array
    addIngredientsFromArray(ingredientsArray: Array<[string, string, number, string?, string?]>): void {
      ingredientsArray.forEach(ing => {
        this.addIngredient(ing[0], ing[1], ing[2], ing[3], ing[4]);
      });
    }
  
    // Import ingredients from CSV string
    importIngredientsFromCSV(csvData: string): void {
      const lines = csvData.split('\n');
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        if (columns.length >= 5) {
          const name = columns[0];
          const unit = columns[1];
          const pricePerG = parseFloat(columns[4]);
          const supplier = columns[5] || '';
          const notes = columns.length > 7 ? columns[7] : '';
          
          // Calculate original price based on unit
          let originalPrice: number;
          if (unit.toLowerCase() === 'kg') {
            originalPrice = pricePerG * 1000;
          } else {
            originalPrice = pricePerG;
          }
          
          this.addIngredient(name, unit, originalPrice, supplier, notes);
        }
      }
    }
  
    // Create a new recipe
    createRecipe(
      name: string,
      yieldAmount: number,
      recipeIngredients: Array<{ ingredient: string; quantity: number; notes?: string }>,
      portionSize?: number
    ): Recipe {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const recipe: Recipe = {
        name,
        yield: yieldAmount,
        date,
        ingredients: recipeIngredients,
        portionSize
      };
      
      this.recipes.set(name, recipe);
      return recipe;
    }
  
    // Calculate the cost of a recipe
    calculateRecipeCost(recipeName: string): { recipe: Recipe; totalCost: number; costPerG: number; costPerPortion?: number } {
      const recipe = this.recipes.get(recipeName);
      if (!recipe) {
        throw new Error(`Recipe "${recipeName}" not found`);
      }
      
      let totalCost = 0;
      
      // Calculate the cost of each ingredient
      recipe.ingredients.forEach(ing => {
        const ingredient = this.ingredients.get(ing.ingredient);
        if (!ingredient) {
          console.warn(`Ingredient "${ing.ingredient}" not found in database`);
          return;
        }
        
        const cost = ing.quantity * ingredient.pricePerG;
        totalCost += cost;
      });
      
      const costPerG = totalCost / recipe.yield;
      const costPerPortion = recipe.portionSize ? costPerG * recipe.portionSize : undefined;
      
      return {
        recipe,
        totalCost,
        costPerG,
        costPerPortion
      };
    }
  
    // Generate CSV output for a recipe
    generateRecipeCSV(recipeName: string): string {
      const { recipe, totalCost, costPerG, costPerPortion } = this.calculateRecipeCost(recipeName);
      
      const lines: string[] = [
        `Recipe Name,${recipe.name},,,,,,`,
        `Yield,${recipe.yield},g,,,,,`,
        `Date,${recipe.date},,,,,`,
        '',
        'Ingredient,Quantity (g),Price per g,Extended Cost,Notes,'
      ];
      
      recipe.ingredients.forEach(ing => {
        const ingredient = this.ingredients.get(ing.ingredient);
        if (!ingredient) return;
        
        const extendedCost = ing.quantity * ingredient.pricePerG;
        lines.push(`${ing.ingredient},${ing.quantity},${ingredient.pricePerG.toFixed(4)},${extendedCost.toFixed(4)},${ing.notes || ''},`);
      });
      
      lines.push('');
      lines.push(`Total Recipe Cost,,,${totalCost.toFixed(4)},,`);
      lines.push(`Yield (g),,,${recipe.yield},,`);
      lines.push(`Cost per g,,,${costPerG.toFixed(4)},,`);
      
      if (recipe.portionSize && costPerPortion) {
        lines.push(`Portion Size (g),,,${recipe.portionSize},,`);
        lines.push(`Cost per Portion,,,${costPerPortion.toFixed(4)},,`);
      }
      
      return lines.join('\n');
    }
  
    // Get all ingredients as variables for reference
    getIngredientsAsVariables(): string {
      const lines: string[] = [
        '// Ingredient variables for reference',
        '// Generated on ' + new Date().toISOString(),
        ''
      ];
      
      this.ingredients.forEach(ing => {
        // Create a valid variable name
        const varName = ing.name
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .toLowerCase();
        
        lines.push(`const ${varName} = ${ing.pricePerG.toFixed(6)}; // ${ing.name} per gram (${ing.unit} @ ${ing.pricePerKg.toFixed(2)})`);
      });
      
      return lines.join('\n');
    }
  
    // Export all data to JSON for saving
    exportData(): string {
      return JSON.stringify({
        ingredients: Array.from(this.ingredients.entries()),
        recipes: Array.from(this.recipes.entries())
      }, null, 2);
    }
  
    // Import data from JSON
    importData(jsonData: string): void {
      try {
        const data = JSON.parse(jsonData);
        
        if (data.ingredients) {
          this.ingredients = new Map(data.ingredients);
        }
        
        if (data.recipes) {
          this.recipes = new Map(data.recipes);
        }
      } catch (e) {
        console.error('Error importing data:', e);
      }
    }
  }
  
  // Example usage
  function main() {
    const calculator = new RecipeCostCalculator();
    
    // Example CSV data (first few lines of your data)
    const csvData = `Ingredient Name,Unit,Total Weight (g),Total Price,Price per g,Supplier,Last Updated,Notes
  Beef Brisket,kg,1000,12.00,0.012,Vendor A,2025-03-06,
  Garlic,kg,1000,3.45,0.00345,Vendor B,2025-03-06,
  Fresh Tarragon,kg,1000,19.60,0.0196,Vendor C,2025-03-06,
  Mayonnaise,kg,1000,5.20,0.0052,Vendor B,2025-03-06,
  Dijon Mustard,kg,1000,4.30,0.0043,Vendor A,2025-03-06,
  Lemon,each,85,0.50,0.00588,Vendor C,2025-03-06,Weight is average per lemon`;
    
    // Import ingredients from CSV
    calculator.importIngredientsFromCSV(csvData);
    
    // Create a sample recipe
    calculator.createRecipe(
      "Garlic Tarragon Aioli",
      1213,
      [
        { ingredient: "Mayonnaise", quantity: 960, notes: "4 cups at 240g per cup" },
        { ingredient: "Confit Garlic Clove", quantity: 120, notes: "20 cloves at 6g per clove" },
        { ingredient: "Fresh Tarragon", quantity: 24, notes: "Finely chopped" },
        { ingredient: "Lemon Juice", quantity: 15, notes: "1 tbsp at 15g" },
        { ingredient: "Worcestershire Sauce", quantity: 30, notes: "2 tbsp at 15g each" },
        { ingredient: "Dijon Mustard", quantity: 60, notes: "4 tbsp at 15g each" },
        { ingredient: "Black Pepper", quantity: 4, notes: "1 tsp" },
        { ingredient: "Salt", quantity: 4, notes: "1 tsp kosher salt" }
      ],
      30
    );
    
    // Generate recipe CSV
    const recipeCSV = calculator.generateRecipeCSV("Garlic Tarragon Aioli");
    console.log(recipeCSV);
    
    // Get ingredients as variables
    const ingredientVars = calculator.getIngredientsAsVariables();
    console.log("\n" + ingredientVars);
  }
  
  // Run the example
  main();
  
  export { RecipeCostCalculator };