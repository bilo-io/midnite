import{l as T}from"./iframe-BMnGZiab.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CGdFNpHx.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BISzOKrZ.js";import"./index-Cu1tsKkm.js";import"./Select-ef7c0426.esm-CduuutyY.js";import"./chevron-down-B3KkTREy.js";import"./check-kjn7ZuW8.js";import"./project-tag-Dv4g2u09.js";import"./site-links-BhZk_F72.js";import"./project-modal-BsJcQvjV.js";import"./export-menu-D0CvsM3o.js";import"./client-BpbU-ITQ.js";import"./markdown-preview-ChB3QVMY.js";import"./index.dom-D_wTd2ti.js";import"./file-text-B4bQniO9.js";import"./copy-BxK9oqOy.js";import"./file-code-corner-zzgpMxKG.js";import"./loader-circle-D7Gdd028.js";import"./api-CJSY_K2f.js";import"./folder-open-Z6JDbkP2.js";import"./folder-CgOQ-D20.js";import"./tag-color-picker-Cd-kgmqL.js";import"./sparkles-DcIE4x8q.js";import"./brain-AL95uazB.js";import"./chevron-right-BegIN2uU.js";import"./markdown-editor-CndG4RmG.js";import"./pencil-D1U3h1rB.js";import"./trash-2-ZkaiBI5W.js";import"./confirm-dialog-BZ_YnPX6.js";import"./triangle-alert-TRgcxMb8.js";import"./templates-B6M1OYb3.js";import"./plus-COkMAY3T.js";import"./task-row-DezmUbhP.js";import"./blocked-badge-DRX02Nsw.js";import"./selectable-icon-C0y8SGh5.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Dm6q2BAS.js";import"./arrow-left-C7hn4qDP.js";import"./spinner-DpwgqQHc.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CkB8l7TL.js";import"./use-api-data-B-KIvPrE.js";import"./useQuery-DtDWpcRz.js";import"./presentation-Cj1izvnW.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
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
}`,...(i=o.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Tt as __namedExportsOrder,Bt as default};
