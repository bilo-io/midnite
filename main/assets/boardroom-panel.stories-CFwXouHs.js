import{aX as T}from"./iframe-CSz9Xzq1.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Cf7qntOT.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CYKnloRQ.js";import"./Select-ef7c0426.esm-C7TzW6fw.js";import"./chevron-down-DwXV9H4X.js";import"./check-CK_hhVdG.js";import"./project-tag-C5U1ysNZ.js";import"./project-modal-C9eyMxlf.js";import"./export-menu-CKkP20Hj.js";import"./client-6nA4M0dQ.js";import"./markdown-preview-DaGSkV4-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BVa81gXt.js";import"./copy-0QkRQNA-.js";import"./file-code-corner-C1lQblSC.js";import"./loader-circle-BRBq3bZx.js";import"./api-CqlK53og.js";import"./folder-open-CT0owekF.js";import"./folder-DivzbGhE.js";import"./tag-color-picker-budp7sxT.js";import"./sparkles-BWjXgB1E.js";import"./brain-Tj4YCkxx.js";import"./chevron-right-jEvMVU_G.js";import"./markdown-editor-Ts7-32ld.js";import"./pencil-oZLKmJ21.js";import"./trash-2-CPEV0hoN.js";import"./confirm-dialog-zqTzpffa.js";import"./index-Ct_LlB5z.js";import"./triangle-alert-jUHgpzPa.js";import"./templates-B6M1OYb3.js";import"./plus-J7sk_j4M.js";import"./task-row-BiOe3xtJ.js";import"./blocked-badge-BLIJiuh5.js";import"./selectable-icon-B05_9YmQ.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BBW3WmIc.js";import"./arrow-left-CkoW4iW7.js";import"./spinner-5w5bpciv.js";import"./task-route-D70_7rUP.js";import"./data-refresh-B6NFAN0P.js";import"./use-api-data-0yKI3jRQ.js";import"./useQuery-D9Ya6Cml.js";import"./presentation-JHxSY3Eq.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Bt as __namedExportsOrder,wt as default};
