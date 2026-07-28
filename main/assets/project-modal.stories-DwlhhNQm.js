import{aX as n,ay as R}from"./iframe-sIaWvBUf.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CKlBNmCA.js";import{P as H}from"./project-modal-BNzF4sRj.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DtcO9DZP.js";import"./Select-ef7c0426.esm-ey-fWCK8.js";import"./chevron-down-pnTWsFL2.js";import"./check-C4HHqLiG.js";import"./index-B8YeLkcR.js";import"./triangle-alert-DnKvQT7z.js";import"./export-menu-BQS0VZYU.js";import"./client-DTkblejR.js";import"./markdown-preview-BaACzGOG.js";import"./index.dom-D_wTd2ti.js";import"./file-text-KrcRGc8W.js";import"./copy-8sb4UcgL.js";import"./file-code-corner-M6NnMazK.js";import"./loader-circle-Do6JDOtQ.js";import"./api-pE96PHEe.js";import"./folder-open-DTjI0sRR.js";import"./folder-DcVC4abj.js";import"./tag-color-picker-M7D90cfQ.js";import"./project-tag-DwT8DVek.js";import"./sparkles-CpoKQ43G.js";import"./brain-CK-VcWe2.js";import"./chevron-right-Ct8ZFpi5.js";import"./markdown-editor-soHuJVD7.js";import"./pencil-CTHGRobv.js";import"./trash-2-Crwc-fJq.js";import"./templates-Bjnqi72I.js";import"./plus-nv-eEQ-8.js";import"./task-row-d8SRtAnc.js";import"./i18n-labels-C2jUwki0.js";import"./selectable-icon-DtHdz4F_.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,wa={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ga=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ga as __namedExportsOrder,wa as default};
