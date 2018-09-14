
**ICLC2019 cards paper**

author:
  - name: Michael Palumbo
    affiliation: York University; Alice Lab; Dispersion Lab
    email: palumbo@yorku.ca
  - name: Graham Wakefield
    affiliation: York University; Alice Lab
    email: grrrwaaa@yorku.ca

abstract: |
  Replace this text with a 100-250 word abstract. You'll find it in the
  'metadata block' at the top of your markdown document), be sure that
  each line of the abstract is indented.
fontsize: 11pt
geometry: margin=2cm
fontfamily: libertine
fontfamily: inconsolata
mainfont: Linux Libertine O
monofont: Inconsolata
bibliography: references.bib
...

Codepen AST view: https://codepen.io/grrrwaaa/pen/XPNOjY?editors=0010
CFDF: https://codepen.io/grrrwaaa/pen/bxgxYy

ICLC2019: http://iclc.livecodenetwork.org/2019/ingles.html#

http://worrydream.com/Tangle/guide.html

# Abstract

Developing and exhibiting artworks which incorporate such fields as worldmaking, responsive environments, artificial life, virtual reality, and machine learning, requires a complex and performance-sensitive code ecosystem. In the context of Alice Lab, for example, C++ code satisfies this constraint, and it provides access to certain useful libraries. However, C++ is not natural to live coding because it is rarely succinct, error-prone as input, and typically demands an asynchronous compile/run cycle. Minor changes to code can yield major consequences in its execution, and so to support creative exploration it is essential to facilitate editing algorithms in the context of the running simulation, such as while immersed in VR. We present *Cards*, a live, distributed, and collaborative projectional editor for editing C++ abstract syntax trees, which affords ongoing runtime on the server with near just-in-time compiling, direct memory access and persistence between edits of state. 


for use in complex and performance-sensitive simulations, and in particular non-desktop situations, such as while immersed in VR or for installations. 


## Rationale / motivations

Therefore we seek to ensure that the simulation not [go down (reword)] while a developer [user?] is still wearing the headset [do we state why here?] is important...  

Value: Liveness really valuable here, for capturing in the moment insights while surrounded by the actual ongoing context, where minor tweaks could have major consequences, or where edits to algorithms could be central to exploration, ... in VR in particular, want to avoid stopping world/taking headset off for every single step. 

Constraint: Working with C++, because
- performance-sensitive (VR can't drop frames!)
- access to certain libraries

Constraint: C++ is not natural to live coding
- error-prone as an input
- rarely succinct (boilerplatey)
- often not given the right kinds of abstractions?
- normally a non-continuous compile/run cycle (not compatible with VR!)
- state and behaviour can be messily tangled

Solutions: 
- Client/server arch for collab
- Projectional editing on the client
- Ongoing runtime on server, with:
	- JIT (or near-JIT) of behaviour (at project-level or more granular?)
	- DMA & persistence-between-edits of state (via mmap for example)

Why projectional? Why edit AST or other representations instead of text?
- no typos :-)
- choose level of abstraction you want -- from syntactic to semantic/intentional levels?
- lay out visually as desired
- in VR in particular, text is awkward: no keyboard, poor use of spatiality, etc.
- Berger et al 2016 offer that projectional editors "...support notations that cannot easily be parsed, such as tables, diagrams or mathematical formulas -- each of which can be mixed with the others and with textual notations [45, 52]" (1)


First steps toward this: 
- working with a 2D browser-based editor for now, which could be readily ported to 3D and WebVR, or a non-browser based client. 
- collaborative via server, which also manages runtime
- bidirectional round-trip of code-AST-code means can edit text and/or other projections at different levels

why in the browser?

motivation behind code bubbles (cards)
moving away from having discrete project files, instead having the code bubbles. its more a matter of grouping pieces of code rather than filling documents. 

---

# Notes (to be deleted)

ICLC/cards editor

preliminary research

like gl: want to be able to separate editable state & editable code

needs: lit review
- code bubbles

being able to view the code in many ways
- control flow
- data flow (e.g. use-mention/read-write of a chosen variable)
- being able to flip between AST-graph / text view
- these views are editable, and connected to each other in useful ways
	+ i.e. the "Includes" view could be connected to the cards graph. when a function is in focus, the methods it uses could be highlighted in the includes pane (this could open up future implementations of reference tools or documentation)

embedding visual meta-info (e.g. card position) into comments in the text, for reversible 
(without needing extra meta-files)

state edit-ability & persistence: mmap hack

generate forward decls of functions so that order generated doesn't matter

graphing files as cards, and which ref each other?
- file level: parsing out functions, includes etc.
parsing includes to get a palette of operations & types
 
question about 'atomic edits':
	- useful: see Ogborn and Beverly 2016, section 2.3, for discussion on code execution.
    - for us: Do a commit at every successful clang compile. 

-------

# design considerations:
CFDF direction:
	vertical boxes/horizontal patchline flow: 
    	- nodes can be more explicit, operations with a lot of nodes will take up a lot of vertical space, and potentially horizontal space 
        - under the assumption that they can be collapsed or expanded
        - need to think about this going forward with vr, where the consistency of a horizontal flow from one output to an input that is, say 3 objects further down, is less importance because we can use the 3rd dimension. 
    
    vs
    
    horizontal box shapes/vertical patchline flow:
    	- 
    
limitations: 
	- cpp2json only accepts a file as input, not a buffer input. in otherwords, this means that when code is changed in the client and saved (sent to server), it must first be saved as the file then read by cpp2json. in the future it would be desirable to just pass the new code as a buffer into cpp2json. graham said he looked at this at first but found something unstable in it...



# References

Visualization of live code -- lots of great examples of non-textual approaches
https://www.researchgate.net/publication/228575469_Visualisation_of_Live_Code/figures?lo=1

Ogborn: live coding together (mentions projectional)
http://www.d0kt0r0.net/text/live-coding-together.html

Lively4 projectional editor, side-by-side text & scratch-like AST editor
https://github.com/LivelyKernel/lively4-projectional-editor

P. Klint, T. van der Storm, and J. Vinju, “RASCAL: A Domain Specific Language for Source Code Analysis and Manipulation,” in Proceedings of the 2009 Ninth IEEE International Working Conference on Source Code Analysis and Manipulation, Washington, DC, USA, 2009, pp. 168–177.



