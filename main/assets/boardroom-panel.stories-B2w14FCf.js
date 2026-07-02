import{n as T}from"./iframe-BmmrWt6z.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-SV6ZUhWS.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BIfiEPeH.js";import"./index-BbnXA0RY.js";import"./check-89hnE8B_.js";import"./project-tag-DVwvq9_O.js";import"./inbound-DGncUCiA.js";import"./project-modal-g1fmNW7P.js";import"./export-menu-DFz27W3J.js";import"./client-dWj9s-78.js";import"./markdown-preview-zMEboOs3.js";import"./index.dom-D_wTd2ti.js";import"./file-text-bYFYsqF8.js";import"./copy-DY-KA08v.js";import"./file-code-corner-a8ZNFd57.js";import"./loader-circle-DCyZnCLI.js";import"./api-LeAear7y.js";import"./folder-open-D2YTh1Zg.js";import"./folder-BMPzbRxw.js";import"./tag-color-picker-CCIGHsqO.js";import"./source-list-editor-DvbsUYs-.js";import"./core.esm-CHWrMIiw.js";import"./source-icon-D8Q7qOtp.js";import"./globe-BALvPKSc.js";import"./sticky-note-CA1Gdw4D.js";import"./plus-CD62RjWg.js";import"./external-link-C1iGA6IL.js";import"./task-row-CHMVFNUK.js";import"./blocked-badge-zHO3GDn5.js";import"./selectable-icon-CDUn1JGE.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CzsUt0bc.js";import"./pencil-CmE2qul3.js";import"./trash-2-CQ6iytZd.js";import"./confirm-dialog-DhXGMhQf.js";import"./triangle-alert-CXtqjutK.js";import"./refresh-cw-1cZBVA6i.js";import"./index-BtcMxtyk.js";import"./lightbulb-sZ879_A-.js";import"./templates-B6M1OYb3.js";import"./sparkles-56y28HGC.js";import"./brain-DcfhYbIv.js";import"./chevron-right-7t2WsMtM.js";import"./spinner-D0XZYUpd.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DHklImlS.js";import"./useQuery-COPdkTj8.js";import"./presentation-ClAvodfA.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: []
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const It=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,It as __namedExportsOrder,kt as default};
