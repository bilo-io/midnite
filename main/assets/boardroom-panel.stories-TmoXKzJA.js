import{n as T}from"./iframe-Dz_DtqUo.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-HoeVDd7l.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-g0iEX4IJ.js";import"./index-D9G6S2GC.js";import"./check-C5PTA9v1.js";import"./project-tag-Ciwv7y0h.js";import"./inbound-CbJZzwyX.js";import"./project-modal-UzSsUN67.js";import"./export-menu-C8N_QvP8.js";import"./client-Dp6U06rs.js";import"./markdown-preview-5O9zbh5e.js";import"./file-text-D5t8H4dT.js";import"./copy-tl_W4F2d.js";import"./loader-circle-CAvnM_Yk.js";import"./api-A95bhGP6.js";import"./folder-open-BoN4j_Jm.js";import"./folder-CTSZcZW1.js";import"./tag-color-picker-CMYgyfaE.js";import"./source-list-editor-DF4byt9-.js";import"./confirm-dialog-C_mqEoFs.js";import"./triangle-alert-CjkTARTl.js";import"./source-icon-DprTp1uE.js";import"./globe-BAe6TdlK.js";import"./sticky-note-C3GL4_ki.js";import"./plus-hMI-Gdtf.js";import"./external-link-NIeTHJj8.js";import"./task-row-DULxP7pg.js";import"./blocked-badge-BPdkeDt5.js";import"./selectable-icon-Dm7cqDmH.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-F3yNzRNa.js";import"./pencil-DJWXXaoM.js";import"./trash-2-Jj66FQdG.js";import"./refresh-cw-CWh3-TFx.js";import"./index-CkL35fn8.js";import"./lightbulb-VyN61Xn-.js";import"./templates-B6M1OYb3.js";import"./sparkles-4K9G5vul.js";import"./brain-V8oMhZ-h.js";import"./chevron-right-CncYfjLn.js";import"./spinner-uZHZc-to.js";import"./data-refresh-D6y1UQQw.js";import"./useQuery-CueEzapo.js";import"./presentation-51xTeI5P.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,Tt as __namedExportsOrder,Bt as default};
