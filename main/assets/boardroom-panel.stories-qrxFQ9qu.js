import{n as T}from"./iframe-CKCsQZq4.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-CrasiaaL.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BX5wH4at.js";import"./index-DIP-HEAf.js";import"./check-BLYlGxxf.js";import"./project-tag-D-_KDpwi.js";import"./inbound-CBNilj0T.js";import"./project-modal-rZ5K1C-c.js";import"./export-menu-CL5HG1Lm.js";import"./client-DpvLNtYL.js";import"./markdown-preview-Cnj895-W.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Ce0_Y08J.js";import"./copy-Bs0sLm_g.js";import"./file-code-corner-CHMHlZyd.js";import"./loader-circle-D_mzYpSO.js";import"./api-x3f2lr37.js";import"./folder-open-BMZkhJX0.js";import"./folder-tldTUXz8.js";import"./tag-color-picker-ToOYsJFV.js";import"./source-list-editor-kMUfslCv.js";import"./core.esm-B8SQ-QC2.js";import"./source-icon-9ijlaZ_U.js";import"./globe-DLCeiwO5.js";import"./sticky-note-5G8T4OSs.js";import"./plus-DqFrD4UD.js";import"./external-link-9mvHZbEQ.js";import"./task-row-BslIW2vI.js";import"./blocked-badge-D_HDs9Ll.js";import"./selectable-icon-DRDMrhio.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-QmD5Xfvh.js";import"./pencil-D_1Ai7XC.js";import"./trash-2-CGJNYFde.js";import"./confirm-dialog-CGI2BbjV.js";import"./triangle-alert-BatrypGD.js";import"./refresh-cw-EkBJnrz1.js";import"./index-Bd0wpSKm.js";import"./lightbulb-XVCo72aj.js";import"./templates-B6M1OYb3.js";import"./sparkles-BgtLYWwz.js";import"./brain-DkyAIVzd.js";import"./chevron-right-D6ZOw0H7.js";import"./spinner-D38w5EvG.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DJNr7h6H.js";import"./useQuery-ljOZEy5i.js";import"./presentation-DKApdvlq.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
