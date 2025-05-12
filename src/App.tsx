import { useState } from 'react'
import styled from '@emotion/styled'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import useSound from 'use-sound'
import treeRustle from './assets/tree-rustle.mp3'

interface FamilyMember {
  id: string
  name: string
  children: FamilyMember[]
}

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom, #f0f8ff, #ffffff);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const TreeContainer = styled.div`
  margin-top: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: auto;
`

const Input = styled.input`
  padding: 0.5rem;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: #45a049;
  }
`

const ExportButton = styled.button`
  background: #2196F3;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &:hover {
    background: #1976D2;
  }
`

const AddButton = styled(motion.button)`
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 1.5rem;
  cursor: pointer;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;

  &:hover {
    background: #45a049;
  }
`

// SVG leaf path (realistic)
const leafPath =
  'M0,0 C20,-40 80,-40 100,0 C80,40 20,40 0,0 Z';

// Tidy tree layout (Reingold–Tilford inspired)
function layoutTree(
  node: FamilyMember,
  x: number,
  y: number,
  level: number,
  siblingIndex: number,
  siblingsCount: number,
  spacingX: number,
  spacingY: number
): any {
  let children: any[] = [];
  let width = 0;
  if (node.children.length > 0) {
    // Recursively layout children
    const childLayouts = node.children.map((child, i) =>
      layoutTree(child, 0, y + spacingY, level + 1, i, node.children.length, spacingX, spacingY)
    );
    // Calculate total width needed for all children (including spacing)
    const totalChildrenWidth = childLayouts.reduce((sum, c) => sum + c.width, 0);
    const totalSpacing = spacingX * 0.5 * (childLayouts.length - 1);
    width = Math.max(totalChildrenWidth + totalSpacing, spacingX);
    // Position children left-to-right
    let currentX = x - width / 2;
    childLayouts.forEach((childLayout, i) => {
      childLayout.x = currentX + childLayout.width / 2;
      children.push(childLayout);
      currentX += childLayout.width + spacingX * 0.5;
    });
    // Center this node above its children
    x = children.length === 1 ? children[0].x : (children[0].x + children[children.length - 1].x) / 2;
  } else {
    width = spacingX;
  }
  return {
    ...node,
    x,
    y,
    width,
    children,
  };
}

// Recursive SVG rendering
function renderTree(
  node: any,
  onAdd: (id: string) => void,
  selectedParent: string | null,
  showInput: boolean,
  inputName: string,
  setInputName: (v: string) => void,
  addFamilyMember: (parentId: string | null, name: string) => void,
  isExporting: boolean
) {
  // Leaf color gradient
  const leafGradientId = `leaf-gradient-${node.id}`;
  // Branch start (parent) and end (child) positions
  return (
    <g key={node.id}>
      {/* Branches to children */}
      {node.children.map((child: any) => (
        <path
          key={child.id + '-branch'}
          d={`M${node.x + 50},${node.y + 40} C${node.x + 50},${node.y + 80} ${child.x + 50},${child.y - 40} ${child.x + 50},${child.y}`}
          stroke="#8B5C2A"
          strokeWidth={8}
          fill="none"
        />
      ))}
      {/* Leaf */}
      <g transform={`translate(${node.x},${node.y})`}>
        <defs>
          <radialGradient id={leafGradientId} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#7ed957" />
            <stop offset="100%" stopColor="#388e3c" />
          </radialGradient>
        </defs>
        <motion.path
          d={leafPath}
          fill={`url(#${leafGradientId})`}
          stroke="#256029"
          strokeWidth={2}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transform="scale(1.2)"
        />
        <text
          x={50}
          y={22}
          textAnchor="middle"
          fontFamily="serif"
          fontWeight="bold"
          fontSize={22}
          fill="#fff"
          style={{ textShadow: '0 2px 4px #256029' }}
        >
          {node.name}
        </text>
        {/* Add button */}
        {!isExporting && (
          <foreignObject x={35} y={65} width={30} height={30} style={{ overflow: 'visible' }}>
            <AddButton
              onClick={() => onAdd(node.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              +
            </AddButton>
          </foreignObject>
        )}
        {/* Input for adding child */}
        {selectedParent === node.id && showInput && (
          <foreignObject x={-30} y={100} width={160} height={40}>
            <Input
              type="text"
              placeholder="Enter child's name"
              value={inputName}
              autoFocus
              onChange={e => setInputName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && inputName.trim()) {
                  addFamilyMember(node.id, inputName.trim())
                }
              }}
            />
          </foreignObject>
        )}
      </g>
      {/* Children */}
      {node.children.map((child: any) =>
        renderTree(child, onAdd, selectedParent, showInput, inputName, setInputName, addFamilyMember, isExporting)
      )}
    </g>
  );
}

function getTreeBounds(node: any, bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) {
  bounds.minX = Math.min(bounds.minX, node.x);
  bounds.maxX = Math.max(bounds.maxX, node.x + 100);
  bounds.minY = Math.min(bounds.minY, node.y);
  bounds.maxY = Math.max(bounds.maxY, node.y + 80);
  if (node.children) {
    node.children.forEach((child: any) => getTreeBounds(child, bounds));
  }
  return bounds;
}

const Footer = styled.footer`
  width: 100%;
  text-align: center;
  margin-top: 2rem;
  color: #888;
  font-size: 1rem;
  a {
    color: #1976D2;
    text-decoration: none;
    font-weight: bold;
  }
`;

function App() {
  const [root, setRoot] = useState<FamilyMember | null>(null)
  const [inputName, setInputName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [selectedParent, setSelectedParent] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [playRustle] = useSound(treeRustle)

  const addFamilyMember = (parentId: string | null, name: string) => {
    const newMember: FamilyMember = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      children: [],
    }
    if (!parentId) {
      setRoot(newMember)
    } else {
      const addChild = (member: FamilyMember): FamilyMember => {
        if (member.id === parentId) {
          return {
            ...member,
            children: [...member.children, newMember],
          }
        }
        return {
          ...member,
          children: member.children.map(addChild),
        }
      }
      setRoot(prevRoot => (prevRoot ? addChild(prevRoot) : null))
    }
    setInputName('')
    setShowInput(false)
    setSelectedParent(null)
    playRustle()
  }

  const handleExport = async () => {
    setIsExporting(true)
    setTimeout(async () => {
      const treeElement = document.getElementById('tree-container')
      if (treeElement) {
        try {
          const dataUrl = await toPng(treeElement)
          const link = document.createElement('a')
          link.download = 'family-tree.png'
          link.href = dataUrl
          link.click()
        } catch (error) {
          console.error('Error exporting tree:', error)
        }
      }
      setIsExporting(false)
    }, 100) // allow React to re-render without the + buttons
  }

  // Layout constants
  const spacingX = 180
  const spacingY = 160
  let svgWidth = 900
  let svgHeight = 700
  let viewBox = `0 0 ${svgWidth} ${svgHeight}`
  let treeLayout: any = null
  if (root) {
    treeLayout = layoutTree(root, 0, 80, 0, 0, 1, spacingX, spacingY)
    // Find bounds
    const bounds = getTreeBounds(treeLayout)
    const padding = 80
    svgWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 900)
    svgHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 700)
    viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${svgWidth} ${svgHeight}`
    // Shift root to center
    treeLayout.x = (bounds.minX + bounds.maxX) / 2 - 50
  }

  return (
    <AppContainer>
      <h1>Family Tree</h1>
      {!root ? (
        <div>
          <Input
            type="text"
            placeholder="Enter the first family member's name"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputName.trim()) {
                addFamilyMember(null, inputName.trim())
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <>
          <TreeContainer id="tree-container" style={{ width: '100%', minWidth: 0, overflow: 'auto' }}>
            <svg
              width="100%"
              height={svgHeight}
              viewBox={viewBox}
              style={{ display: 'block', minWidth: svgWidth, minHeight: svgHeight }}
            >
              {/* Trunk */}
              {treeLayout && (
                <path
                  d={`M${treeLayout.x + 50},${svgHeight + (parseInt(viewBox.split(' ')[1]) || 0)} C${treeLayout.x + 10},${svgHeight - 200 + (parseInt(viewBox.split(' ')[1]) || 0)} ${treeLayout.x + 40},160 ${treeLayout.x + 50},80`}
                  stroke="#8B5C2A"
                  strokeWidth={28}
                  fill="none"
                />
              )}
              {treeLayout &&
                renderTree(
                  treeLayout,
                  (id) => {
                    setShowInput(true)
                    setSelectedParent(id)
                  },
                  selectedParent,
                  showInput,
                  inputName,
                  setInputName,
                  addFamilyMember,
                  isExporting
                )}
            </svg>
          </TreeContainer>
          <AnimatePresence>
            {showInput && !selectedParent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Input
                  type="text"
                  placeholder="Enter child's name"
                  value={inputName}
                  onChange={e => setInputName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && inputName.trim()) {
                      addFamilyMember(selectedParent, inputName.trim())
                    }
                  }}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
          <ExportButton onClick={handleExport}>Export as Image</ExportButton>
        </>
      )}
      <Footer>
        Created by <a href="https://github.com/mbm3m" target="_blank" rel="noopener noreferrer">Github Profile</a><br />
        m.b.almotawa@hotmail.com
      </Footer>
    </AppContainer>
  )
}

export default App
