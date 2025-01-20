# Budget Builder

## Homepage

https://vinhdk.github.com/budget-builder

## How to run

### 1. Clone the repository

```bash
git clone https://github.com/vinhdk/budget-builder.git
```

### 2. Install dependencies with pnpm

```bash
pnpm install
```

### 3. Run the application

```bash
pnpm start
```

## How to use

### 1. Open the application

Open the application in your browser at http://localhost:4200

### 2. Checking data

- If you open the application for the first time, system will auto mock the data
- Next time you open the application, the data will be saved in the indexedDB

### 3. Buttons

- Click on the `Add Group` button to add new group
- click on the `Add Category` button to add new category

### 4. Input events

#### Focused Inputs

- Press `Enter` to add new category when you are focusing on the input
- `Double-click` on the input to edit the value

#### UnFocused Inputs

- Press `Enter` to focus input, and start editing
- Press `Tab` to move focus to the next/previous input
- Press `Arrow Left/Right` to move focus to the next/previous input
- Press `Arrow Up/Down` to move focus to the next/previous input of previous/next row
