// ⚠️  DEPRECATED — Bu yama dosyası app.js'in eski sürümüne aittir.
// Mevcut app.js, pointer event'leri window seviyesinde dinliyor (blockEl yerine).
// Bu scripti çalıştırırsanız drag-and-drop sistemi BOZULUR.
// Güvenli şekilde silinebilir.

const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// Update activeDrag object
code = code.replace(/let activeDrag = \{[\s\S]*?offsetC: null\n\};/, `let activeDrag = {
    blockEl: null,
    shape: null,
    slotIndex: null,
    pointerId: null,
    dragOffset: { x: 0, y: 0 },
    gridCellSize: 0,
    gap: 6,
    validPlacement: false,
    targetCells: [],
    originalSlot: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    offsetR: null,
    offsetC: null,
    isDragging: false
};`);

// Find the boundaries of the functions
function replaceFunction(codeStr, funcName, newBody) {
    const startStr = `function ${funcName}(`;
    const startIndex = codeStr.indexOf(startStr);
    if (startIndex === -1) return codeStr;
    
    let braceCount = 0;
    let inString = false;
    let endIndex = -1;
    
    // Find the first opening brace
    let i = startIndex;
    while (codeStr[i] !== '{') {
        i++;
    }
    
    for (; i < codeStr.length; i++) {
        if (codeStr[i] === '"' || codeStr[i] === "'") {
            // handle simple string boundaries
            if (codeStr[i-1] !== '\\') inString = !inString;
        }
        if (!inString) {
            if (codeStr[i] === '{') braceCount++;
            if (codeStr[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }
        }
    }
    
    if (endIndex !== -1) {
        return codeStr.substring(0, startIndex) + newBody + codeStr.substring(endIndex);
    }
    return codeStr;
}

const newOnPointerDown = `function onPointerDown(e, blockEl, shape, slotIndex) {
    if (state.isGameOver) return;
    e.preventDefault();

    activeDrag.blockEl = blockEl;
    activeDrag.shape = shape;
    activeDrag.slotIndex = slotIndex;
    activeDrag.pointerId = e.pointerId;
    activeDrag.originalSlot = blockEl.parentElement;
    activeDrag.startX = e.clientX;
    activeDrag.startY = e.clientY;
    activeDrag.startTime = Date.now();
    activeDrag.isDragging = false;

    const firstGridCell = gridBoard.querySelector('.grid-cell');
    activeDrag.gridCellSize = firstGridCell.getBoundingClientRect().width;
    activeDrag.gap = 6;

    blockEl.setPointerCapture(e.pointerId);
    blockEl.addEventListener('pointermove', onPointerMove);
    blockEl.addEventListener('pointerup', onPointerUp);
    blockEl.addEventListener('pointercancel', onPointerUp);
}`;

const newOnPointerMove = `function onPointerMove(e) {
    if (!activeDrag.blockEl || e.pointerId !== activeDrag.pointerId) return;
    const blockEl = activeDrag.blockEl;

    if (!activeDrag.isDragging) {
        const moveDist = Math.hypot(e.clientX - activeDrag.startX, e.clientY - activeDrag.startY);
        if (moveDist > 8) {
            activeDrag.isDragging = true;
            AudioFX.playGrab();
            
            const shape = activeDrag.shape;
            const cols = shape.matrix[0].length;
            const rows = shape.matrix.length;
            const targetWidth = cols * activeDrag.gridCellSize + (cols - 1) * activeDrag.gap;
            const targetHeight = rows * activeDrag.gridCellSize + (rows - 1) * activeDrag.gap;

            activeDrag.dragOffset = {
                x: targetWidth / 2,
                y: targetHeight / 2
            };

            blockEl.classList.remove('in-dock');
            blockEl.classList.add('dragging');
            document.body.appendChild(blockEl);

            blockEl.style.position = 'fixed';
            blockEl.style.width = \`\${targetWidth}px\`;
            blockEl.style.height = \`\${targetHeight}px\`;
            blockEl.style.gap = \`\${activeDrag.gap}px\`;
        } else {
            return;
        }
    }

    if (activeDrag.isDragging) {
        blockEl.style.left = \`\${e.clientX - activeDrag.dragOffset.x}px\`;
        blockEl.style.top = \`\${e.clientY - activeDrag.dragOffset.y}px\`;
        checkPlacementValidity();
    }
}`;

const newOnPointerUp = `function onPointerUp(e) {
    if (!activeDrag.blockEl || e.pointerId !== activeDrag.pointerId) return;

    const { blockEl, shape, slotIndex, validPlacement, targetCells, originalSlot, isDragging } = activeDrag;

    blockEl.removeEventListener('pointermove', onPointerMove);
    blockEl.removeEventListener('pointerup', onPointerUp);
    blockEl.removeEventListener('pointercancel', onPointerUp);

    clearGridHighlights();

    if (!isDragging) {
        if (state.rotationRights > 0) {
            state.rotationRights--;
            updateScoreUI();
            AudioFX.playRotate();

            const rCount = shape.matrix.length;
            shape.matrix = getRotatedMatrix(shape.matrix);

            if (shape.bombCell) {
                const oldR = shape.bombCell.r;
                const oldC = shape.bombCell.c;
                shape.bombCell.r = oldC;
                shape.bombCell.c = rCount - 1 - oldR;
            }

            state.dockedBlocks[slotIndex] = shape;

            if (originalSlot) {
                blockEl.style.transition = 'transform 0.2s ease-in-out';
                blockEl.style.transform = 'rotate(90deg)';
                
                setTimeout(() => {
                    originalSlot.innerHTML = '';
                    renderBlockInSlot(shape, originalSlot, slotIndex);
                }, 200);
            }
        } else {
            if (state.jokers > 0) {
                state.jokers--;
                localStorage.setItem('bomblok_jokers', state.jokers);
                state.rotationRights += 1;
                updateJokerButtonsUI();
                AudioFX.playReroll();
                
                state.rotationRights--;
                updateScoreUI();
                AudioFX.playRotate();
                
                const rCount = shape.matrix.length;
                shape.matrix = getRotatedMatrix(shape.matrix);
                if (shape.bombCell) {
                    const oldR = shape.bombCell.r;
                    const oldC = shape.bombCell.c;
                    shape.bombCell.r = oldC;
                    shape.bombCell.c = rCount - 1 - oldR;
                }
                state.dockedBlocks[slotIndex] = shape;
                
                if (originalSlot) {
                    blockEl.style.transition = 'transform 0.2s ease-in-out';
                    blockEl.style.transform = 'rotate(90deg)';
                    setTimeout(() => {
                        originalSlot.innerHTML = '';
                        renderBlockInSlot(shape, originalSlot, slotIndex);
                    }, 200);
                }
            } else {
                AudioFX.playBuzzer();
                blockEl.classList.add('error-shake');
                setTimeout(() => blockEl.classList.remove('error-shake'), 400);
            }
        }
    } else {
        if (validPlacement && targetCells.length > 0) {
            AudioFX.playDrop();
            saveStateSnapshot();
            
            targetCells.forEach(cell => {
                const relativeR = cell.r - activeDrag.offsetR;
                const relativeC = cell.c - activeDrag.offsetC;
                const isBomb = shape.bombCell && shape.bombCell.r === relativeR && shape.bombCell.c === relativeC;
                const cellColor = isBomb ? \`\${shape.color}-bomb\` : shape.color;

                state.grid[cell.r][cell.c] = {
                    color: cellColor,
                    bombTimer: isBomb ? shape.bombTimer : null
                };
            });

            blockEl.remove();
            state.dockedBlocks[slotIndex] = null;
            checkAndClearLines();
            
            const isDockEmpty = state.dockedBlocks.every(b => b === null);
            if (isDockEmpty) generateDockBlocks();
            updateJokerButtonsUI();
        } else {
            AudioFX.playBuzzer();
            blockEl.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            const rect = originalSlot.getBoundingClientRect();
            blockEl.style.left = \`\${rect.left}px\`;
            blockEl.style.top = \`\${rect.top}px\`;
            blockEl.style.transform = 'scale(1)';

            setTimeout(() => {
                blockEl.remove();
                if (originalSlot) {
                    originalSlot.innerHTML = '';
                    renderBlockInSlot(shape, originalSlot, slotIndex);
                }
            }, 200);
        }
    }

    activeDrag = {
        blockEl: null, shape: null, slotIndex: null, pointerId: null,
        dragOffset: { x: 0, y: 0 }, gridCellSize: 0, gap: 6,
        validPlacement: false, targetCells: [], originalSlot: null,
        startX: 0, startY: 0, startTime: 0, offsetR: null, offsetC: null, isDragging: false
    };
}`;

code = replaceFunction(code, 'onPointerDown', newOnPointerDown);
code = replaceFunction(code, 'onPointerMove', newOnPointerMove);
code = replaceFunction(code, 'onPointerUp', newOnPointerUp);

fs.writeFileSync('app.js', code);
console.log('Successfully patched app.js');
