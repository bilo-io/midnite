import{r as s,n as t,X as ve}from"./iframe-BmmrWt6z.js";import{b as V,p as ge,d as xe}from"./fixtures-CckvYj1j.js";import{u as ye,C as he}from"./confirm-dialog-DhXGMhQf.js";import{k as T,Z as fe}from"./inbound-DGncUCiA.js";import{t as we,X as I,N as be}from"./index-BbnXA0RY.js";import{M as _e}from"./markdown-editor-CzsUt0bc.js";import{a as W,S as je,o as Ce}from"./source-list-editor-DvbsUYs-.js";import{O as Ne,M as Se,a as Ee,g as Be,T as Me,d as ke}from"./api-LeAear7y.js";import{B as ee}from"./brain-DcfhYbIv.js";import{T as Re}from"./trash-2-CQ6iytZd.js";import{L as Te}from"./loader-circle-DCyZnCLI.js";import"./preload-helper-Dp1pzeXC.js";import"./triangle-alert-CXtqjutK.js";import"./Select-ef7c0426.esm-BIfiEPeH.js";import"./check-89hnE8B_.js";import"./markdown-preview-zMEboOs3.js";import"./index.dom-D_wTd2ti.js";import"./pencil-CmE2qul3.js";import"./core.esm-CHWrMIiw.js";import"./source-icon-D8Q7qOtp.js";import"./globe-BALvPKSc.js";import"./sticky-note-CA1Gdw4D.js";import"./plus-CD62RjWg.js";import"./external-link-C1iGA6IL.js";const w="global";function oe({memory:e,projects:l,initialProjectId:r,onClose:g,onSaved:Z}){var _;const[c,ae]=s.useState((_=e==null?void 0:e.title)!==null&&_!==void 0?_:"");var j,C;const[x,ne]=s.useState((C=(j=e==null?void 0:e.projectId)!==null&&j!==void 0?j:r)!==null&&C!==void 0?C:w);var N;const[y,re]=s.useState((N=e==null?void 0:e.content)!==null&&N!==void 0?N:""),[a,d]=s.useState(e),[h,S]=s.useState([]),[E,f]=s.useState(!1),[J,m]=s.useState(null),Q=ye(),se=[{value:w,label:"Global — every project",icon:t.jsx(ee,{className:"h-4 w-4 text-[hsl(262_83%_66%)]"})},...l.map(o=>({value:o.id,label:o.name,icon:t.jsx("span",{"aria-hidden":!0,className:"h-2.5 w-2.5 rounded-full",style:{backgroundColor:o.color}})}))];var B;const ie=e===null||c!==e.title||y!==e.content||x!==((B=e.projectId)!==null&&B!==void 0?B:w),le=async()=>{if(!c.trim()){m("Give this memory a title.");return}m(null),f(!0);try{const o=x===w?null:x;e?await Me(e.id,{title:c,content:y,projectId:o}):await ke({title:c,content:y,projectId:o,sources:h}),Z(),g()}catch(o){m(o instanceof Error?o.message:"Something went wrong"),f(!1)}},ce=async()=>{if(!(!e||!await Q({title:"Delete this memory?",description:`“${e.title}” will no longer be available to your agents.`,confirmLabel:"Delete"}))){m(null),f(!0);try{await Be(e.id),Z(),g()}catch(n){m(n instanceof Error?n.message:"Something went wrong"),f(!1)}}},de=async o=>{a&&d(await Ee(a.id,o))},me=async o=>{!a||!await Q({title:"Remove this source?",description:"It will be detached from this memory.",confirmLabel:"Remove"})||d(await Se(a.id,o))},ue=async o=>{if(!a)return;const n=a;d({...n,sources:Ce(n.sources,o)});try{d(await Ne(n.id,o))}catch(R){throw d(n),R}};var M;const pe=e?(M=a==null?void 0:a.sources.length)!==null&&M!==void 0?M:0:h.length;var k;return t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"fixed inset-0 z-50 bg-background/40 backdrop-blur-md",onClick:g,"aria-hidden":!0}),t.jsx("div",{className:"pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4",children:t.jsxs("div",{role:"dialog","aria-modal":"true","aria-label":e?`${e.title} memory`:"New memory",className:"pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl",onClick:o=>o.stopPropagation(),children:[t.jsxs("header",{className:"flex items-center gap-3 border-b border-border/60 px-5 py-3.5",children:[t.jsx(ee,{className:"h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]"}),t.jsx(we,{value:c,onChange:o=>ae(o.target.value),"aria-label":"Memory title",placeholder:"Untitled memory",className:"h-8 flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border/60 focus-visible:border-foreground/20"}),t.jsx(I,{type:"button",variant:"ghost",size:"icon","aria-label":"Close",onClick:g,children:t.jsx(ve,{className:"h-4 w-4"})})]}),t.jsxs("div",{className:"flex-1 space-y-3 overflow-y-auto px-5 py-4",children:[t.jsxs("label",{className:"block space-y-1.5",children:[t.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Scope"}),t.jsx(be,{options:se,value:x,onChange:ne,"aria-label":"Memory scope"})]}),t.jsx(_e,{value:y,onChange:re,minHeight:140,defaultMode:e?"preview":"edit",label:t.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Content"}),ariaLabel:"Memory content"}),t.jsxs("div",{className:"space-y-1.5",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Sources"}),t.jsxs("span",{className:"text-[11px] tabular-nums text-muted-foreground",children:[pe,"/",T]})]}),e?t.jsx(W,{sources:(k=a==null?void 0:a.sources)!==null&&k!==void 0?k:[],max:T,placeholder:"Paste a doc, repo, or any reference link",onAdd:de,onRemove:me,onReorder:ue}):t.jsx(W,{sources:h.map(o=>({id:o,url:o,kind:fe(o)})),max:T,placeholder:"Paste a doc, repo, or any reference link",onAdd:o=>{h.includes(o)||S(n=>[...n,o])},onRemove:o=>S(n=>n.filter(R=>R!==o)),onReorder:o=>S(o)})]}),J?t.jsx("p",{className:"text-xs text-destructive",children:J}):null]}),t.jsxs("footer",{className:"flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5",children:[e?t.jsxs(I,{type:"button",variant:"ghost",size:"sm",onClick:()=>void ce(),disabled:E,className:"text-muted-foreground hover:text-destructive",children:[t.jsx(Re,{className:"h-4 w-4"}),"Delete"]}):t.jsx("span",{}),t.jsxs(I,{type:"button",size:"sm",onClick:()=>void le(),disabled:E||!ie,children:[E?t.jsx(Te,{className:"h-4 w-4 animate-spin"}):t.jsx(je,{className:"h-4 w-4"}),e?"Save":"Create"]})]})]})})]})}oe.__docgenInfo={description:`The memory detail view: edit the title, scope (global or a project), the
markdown content, and reference sources. Title/scope/content save on the
button; sources save live in edit mode and stage client-side when creating.`,methods:[],displayName:"MemoryModal",props:{memory:{required:!0,tsType:{name:"union",raw:"Memory | null",elements:[{name:"Memory"},{name:"null"}]},description:"null = create a new memory."},projects:{required:!0,tsType:{name:"Array",elements:[{name:"Project"}],raw:"Project[]"},description:""},initialProjectId:{required:!1,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:"Preselect a scope when creating (a project id, or null for global)."},onClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onSaved:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};var D,L,O,P,G,q,z,A,$,X,H,U,K,Y,F;const{expect:b,fn:te,userEvent:Ie,within:i}=__STORYBOOK_MODULE_TEST__,nt={title:"Components/MemoryModal",component:oe,args:{projects:[ge,xe],onClose:te(),onSaved:te()},decorators:[e=>t.jsx(he,{children:t.jsx(e,{})})]},u={args:{memory:null},play:async({canvasElement:e})=>{const r=await i(e).findByRole("dialog",{name:"New memory"});await b(i(r).getByRole("button",{name:"Create"})).toBeInTheDocument()}},p={args:{memory:V},play:async({canvasElement:e})=>{const r=await i(e).findByRole("dialog",{name:`${V.title} memory`});await b(i(r).getByRole("button",{name:"Save"})).toBeInTheDocument(),await b(i(r).getByRole("button",{name:"Delete"})).toBeInTheDocument()}},v={args:{memory:null},play:async({args:e,canvasElement:l})=>{const r=i(l);await Ie.click(r.getByRole("button",{name:"Close"})),await b(e.onClose).toHaveBeenCalledOnce()}};u.parameters={...u.parameters,docs:{...(D=u.parameters)===null||D===void 0?void 0:D.docs,source:{originalSource:`{
  args: {
    memory: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New memory'
    });
    await expect(within(dialog).getByRole('button', {
      name: 'Create'
    })).toBeInTheDocument();
  }
}`,...(O=u.parameters)===null||O===void 0||(L=O.docs)===null||L===void 0?void 0:L.source},description:{story:'Creating a new memory — title blank, scope defaults to Global, primary button reads "Create".',...(G=u.parameters)===null||G===void 0||(P=G.docs)===null||P===void 0?void 0:P.description}}};p.parameters={...p.parameters,docs:{...(q=p.parameters)===null||q===void 0?void 0:q.docs,source:{originalSource:`{
  args: {
    memory: memoryGlobal
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: \`\${memoryGlobal.title} memory\`
    });
    await expect(within(dialog).getByRole('button', {
      name: 'Save'
    })).toBeInTheDocument();
    await expect(within(dialog).getByRole('button', {
      name: 'Delete'
    })).toBeInTheDocument();
  }
}`,...(A=p.parameters)===null||A===void 0||(z=A.docs)===null||z===void 0?void 0:z.source},description:{story:"Editing an existing memory — title pre-filled, with Save + Delete actions.",...(X=p.parameters)===null||X===void 0||($=X.docs)===null||$===void 0?void 0:$.description}}};v.parameters={...v.parameters,docs:{...(H=v.parameters)===null||H===void 0?void 0:H.docs,source:{originalSource:`{
  args: {
    memory: null
  },
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Close'
    }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  }
}`,...(K=v.parameters)===null||K===void 0||(U=K.docs)===null||U===void 0?void 0:U.source},description:{story:"The close button invokes onClose.",...(F=v.parameters)===null||F===void 0||(Y=F.docs)===null||Y===void 0?void 0:Y.description}}};const rt=["New","Edit","Closes"];export{v as Closes,p as Edit,u as New,rt as __namedExportsOrder,nt as default};
