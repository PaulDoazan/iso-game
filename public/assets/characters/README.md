# Character Sprite Sheets

Place your character sprite sheets here!

## Recommended Free Resources

Here are some great places to find free character sprite sheets:

1. **Itch.io** - https://itch.io/game-assets/free/tag-characters/tag-sprites
   - Search for "top down character" or "walk cycle"
   - Many free assets with permissive licenses

2. **OpenGameArt** - https://opengameart.org/
   - Huge collection of free game art
   - Filter by "sprites" and "characters"

3. **Kenney.nl** - https://kenney.nl/assets
   - High-quality free game assets
   - Very permissive license

4. **CraftPix** - https://craftpix.net/
   - Free and premium sprite sheets
   - Good for top-down games

## Sprite Sheet Format

Your sprite sheet should be:
- **PNG format** (transparent background recommended)
- **JSON metadata** (if using TexturePacker or similar)
- **Walk cycle frames** arranged horizontally or in a grid

## Example Structure

```
public/assets/characters/
  ├── hero.png          (sprite sheet image)
  ├── hero.json          (frame metadata - optional)
  └── README.md          (this file)
```

## Integration

Once you have a sprite sheet:

1. Place the PNG (and JSON if available) in this folder
2. Update `Character.ts` to load and parse the sprite sheet
3. The character will automatically use the new sprite sheet!

## Popular Free Sprite Sheets

- **Memao Fantasy Character Pack** (itch.io) - 10 characters with walk cycles
- **Top-Down Character Base** (itch.io) - Simple but effective
- **2D Character Sprite Pack 128x128** (itch.io) - 94 animations!



